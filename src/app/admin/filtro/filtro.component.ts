import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService } from '../../services/users.service';
import { apuestaService } from '../../services/apuestas.service';
import { RetirosService } from '../../services/retiros.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { firstValueFrom, forkJoin } from 'rxjs';

@Component({
    selector: 'app-filtro',
    standalone: true,
    imports: [CommonModule, FormsModule, DecimalPipe, CurrencyPipe, DatePipe],
    templateUrl: './filtro.component.html',
    styleUrls: ['./filtro.component.css']
})
export class FiltroComponent implements OnInit, OnDestroy {

    snapshot: any = null;
    liveData: any = null;
    hybridData: any = null;
    finalSnapshot: any = null;
    loading = true;
    streamSeleccionado: string = '1';
    intervalId: any;
    mostrarModalFinalizar: boolean = false;
    mostrarModalReiniciar: boolean = false; // Moved here for better organization
    diferenciaSaldo: number = 0;
    diferenciaVivo: number = 0;

    // LIVE BET TOTALS
    totalRojoLive: number = 0;
    totalVerdeLive: number = 0;

    // DESGLOSE USUARIOS
    usuariosDesglose: any[] = [];
    totalTieneDeMas: number = 0;
    totalFalta: number = 0;

    // DESGLOSE APUESTA ACTUAL
    rondaActual: number = 0;
    abierta = { rojo: 0, verde: 0, total: 0 };
    cazado = { rojo: 0, verde: 0, total: 0 };
    devuelto = { rojo: 0, verde: 0, total: 0 };
    resumenApuesta = { cobrado: 0, pagado: 0, cazado10: 0, total: 0 };

    constructor(
        private router: Router,
        private usersService: UsersService,
        private apuestasService: apuestaService,
        private http: HttpClient,
        private retirosService: RetirosService
    ) { }

    ngOnInit() {
        this.cargarDatosInicio(); // Initial Load
        this.cargarDatosEnVivo();
        this.intervalId = setInterval(() => {
            this.cargarDatosEnVivo();
        }, 5000); // Poll every 5 seconds
    }

    ngOnDestroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    onStreamChange() {
        this.cargarDatosInicio();
        this.cargarDatosEnVivo();
    }

    cargarDatosInicio() {
        this.loading = true;
        this.snapshot = null;

        this.usersService.getClaveStream(this.streamSeleccionado).subscribe({
            next: (res: any) => {
                if (res.stream) {
                    this.snapshot = res.stream.snapshot || null;
                    this.finalSnapshot = res.stream.finalSnapshot || null;

                    // FIX: Override historical retiros with current pending retiros (Frontend-only request)
                    // STATIC BEHAVIOR FIX: Only count withdrawals created BEFORE the stream started
                    if (this.snapshot) {
                        this.retirosService.getAllSolicitudes().subscribe({
                            next: (retiros: any[]) => {
                                const startedAtDate = new Date(this.snapshot.startedAt); // Timestamp from backend snapshot

                                const retirosPendientes = retiros.filter(r => {
                                    // Must be pending AND created before or at stream start time
                                    const fechaSolicitud = new Date(r.fechaSolicitud);
                                    return r.estado === 'pendiente' && fechaSolicitud.getTime() <= startedAtDate.getTime();
                                });

                                const totalPendiente = retirosPendientes.reduce((acc, r) => {
                                    const cantidad = typeof r.cantidad === 'string' ? Number(r.cantidad.replace(/[^0-9.]/g, '')) : Number(r.cantidad || 0);
                                    return acc + (isNaN(cantidad) ? 0 : cantidad);
                                }, 0);

                                this.snapshot.retiros = totalPendiente;
                                // Recalculate total for display consistency
                                this.snapshot.total = (this.snapshot.saldoGlobal || 0) + this.snapshot.retiros;
                                this.loading = false;
                            },
                            error: (err) => {
                                console.error('Error loading pending retiros for snapshot override:', err);
                                this.loading = false;
                            }
                        });
                    } else {
                        this.loading = false;
                    }

                } else {
                    this.snapshot = null;
                    this.finalSnapshot = null;
                    this.loading = false;
                }
            },
            error: (err: any) => {
                console.error('Error cargando snapshot:', err);
                this.loading = false;
            }
        });
    }

    cargarDatosEnVivo() {
        this.usersService.getClaveStream(this.streamSeleccionado).subscribe({
            next: (streamRes: any) => {
                const streamClave = streamRes.stream?.clave; // Full name "Stream1-06-02-2026"

                this.usersService.getStreamLiveData(this.streamSeleccionado).subscribe({
                    next: async (res: any) => {
                        if (res.success && res.data) {
                            let d = res.data;

                            try {
                                // Prepare checks
                                const saldoRequest = this.http.get<any[]>(`${environment.apiUrl}/api/saldos/obtener-registros-saldos`);

                                // Request grouped bets for Cazado (logic from ApuestasStreamComponent)
                                let apuestasRequest = Promise.resolve({});
                                if (streamClave) {
                                    apuestasRequest = firstValueFrom(this.apuestasService.obtenerTodasApuestasAgrupadas(streamClave));
                                }

                                // Request pending withdrawals for Hybrid Data (Second Circle)
                                const retirosRequest = firstValueFrom(this.retirosService.getAllSolicitudes());

                                const [apuestasAgrupadas, saldosRecords, retiros] = await Promise.all([
                                    apuestasRequest,
                                    firstValueFrom(saldoRequest),
                                    retirosRequest
                                ]);


                                // 1. FIX CAZADO: Matches ApuestasStreamComponent logic
                                // Filter by estado === 'pagada'
                                let todasLasApuestas: any[] = [];
                                if (apuestasAgrupadas && Object.keys(apuestasAgrupadas).length > 0) {
                                    todasLasApuestas = Array.isArray(apuestasAgrupadas) ? apuestasAgrupadas : Object.values(apuestasAgrupadas);
                                }

                                // Calculate full 100% amount for internal logic
                                const cazadoFull = todasLasApuestas
                                    .filter(a => a.estado === 'pagada')
                                    .reduce((total, a) => total + Number(a.cantidadTotal || a.cantidad || a.monto), 0);

                                // Calculate 10% for display
                                const cazadoDisplay = cazadoFull * 0.10;

                                // --- NUEVO: DESGLOSE APUESTA ACTUAL ---
                                let maxRonda = 0;
                                todasLasApuestas.forEach(a => {
                                    const r = Number(a.ronda) || 0;
                                    if (r > maxRonda) maxRonda = r;
                                });
                                this.rondaActual = maxRonda;

                                // Reiniciar valores al recalcular
                                this.abierta = { rojo: 0, verde: 0, total: 0 };
                                this.cazado = { rojo: 0, verde: 0, total: 0 };
                                this.devuelto = { rojo: 0, verde: 0, total: 0 };
                                this.resumenApuesta = { cobrado: 0, pagado: 0, cazado10: 0, total: 0 };

                                const apuestasRondaActual = todasLasApuestas.filter(a => (Number(a.ronda) || 0) === this.rondaActual);

                                apuestasRondaActual.forEach(apuesta => {
                                    const monto = Number(apuesta.cantidadTotal || apuesta.cantidad || apuesta.monto || 0);
                                    const esVerde = apuesta.verde && apuesta.verde !== '';

                                    if (apuesta.estado === 'en_espera') {
                                        if (esVerde) this.abierta.verde += monto;
                                        else this.abierta.rojo += monto;
                                        this.abierta.total += monto;
                                    } else if (apuesta.estado === 'cazada') {
                                        if (esVerde) this.cazado.verde += monto;
                                        else this.cazado.rojo += monto;
                                        this.cazado.total += monto;
                                    } else if (apuesta.estado === 'devuelta') {
                                        if (esVerde) this.devuelto.verde += monto;
                                        else this.devuelto.rojo += monto;
                                        this.devuelto.total += monto;
                                    }

                                    // Para el resumen final: COBRADO, PAGADO, CAZADO 10%
                                    if (apuesta.estado === 'perdida') {
                                        this.resumenApuesta.cobrado += monto;
                                    } else if (apuesta.estado === 'pagada') {
                                        this.resumenApuesta.pagado += (monto * 0.9);
                                        this.resumenApuesta.cazado10 += (monto * 0.1);
                                    }
                                });

                                this.resumenApuesta.total = this.resumenApuesta.cobrado - this.resumenApuesta.pagado + this.resumenApuesta.cazado10;
                                // --------------------------------------

                                // 1.1 ADDITION: Calculate total for Red and Green (only active bets)
                                let tempTotalRojo = 0;
                                let tempTotalVerde = 0;

                                // Filter only unsettled/active bets for the UI (Apuestas Abiertas)
                                const apuestasActivas = todasLasApuestas.filter(a => a.estado === 'en_espera' || a.estado === 'cazada');

                                apuestasActivas.forEach(apuesta => {
                                    // Based on how apuestas-stream checks green: if (verde != "") it's green
                                    const montoApuesta = Number(apuesta.cantidadTotal || apuesta.cantidad || apuesta.monto || 0);
                                    if (apuesta.verde && apuesta.verde !== '') {
                                        tempTotalVerde += montoApuesta;
                                    } else {
                                        tempTotalRojo += montoApuesta;
                                    }
                                });

                                this.totalRojoLive = tempTotalRojo;
                                this.totalVerdeLive = tempTotalVerde;

                                // 2. FIX SALDO MANUAL: Matches HistorialSaldosService logic
                                const startedAtDate = new Date(d.startedAt);
                                const saldoManualReal = saldosRecords
                                    .filter(r => {
                                        const recordDate = new Date(r.fecha);
                                        return recordDate >= startedAtDate &&
                                            r.tipo !== 'recarga' &&
                                            r.tipo !== 'restar_saldo' &&
                                            r.tipo !== 'retiro_aprobado';
                                    })
                                    .reduce((acc, r) => acc + (Number(r.saldo) || 0), 0);

                                // Overwrite with DISPLAY value (10%)
                                d.cazado = cazadoDisplay;
                                d.saldoManual = saldoManualReal;

                                // 3. FIX RETIROS (Second Circle Only): Calculate pending withdrawals
                                const retirosPendientes = (retiros as any[]).filter(r => r.estado === 'pendiente');
                                const totalPendiente = retirosPendientes.reduce((acc, r) => {
                                    const cantidad = typeof r.cantidad === 'string' ? Number(r.cantidad.replace(/[^0-9.]/g, '')) : Number(r.cantidad || 0);
                                    return acc + (isNaN(cantidad) ? 0 : cantidad);
                                }, 0);

                                // Assign to a local var
                                const retirosForHybrid = totalPendiente;

                                // Re-calculate local variables if try-catch scope issue (d is modified in place so it persists)
                                // Correcting calculation to use displayed cazado (10%) for visual consistency
                                const cazadoForCalc = d.cazado;

                                // USER REQUEST: Third Circle (Live) must ALSO show real-time pending withdrawals
                                d.retiros = retirosForHybrid;

                                /* TOTAL CALCULATION (Use 10%, i.e., Displayed Value) */
                                // USER REQUEST: Third Circle (Live) full calculation
                                const totalLive = d.saldoGlobal + d.retiros + d.depositos + d.saldoManual - d.restaManual - cazadoForCalc;
                                this.liveData = { ...d, total: totalLive };

                                if (this.snapshot) {
                                    const globalInicio = this.snapshot.saldoGlobal || 0;
                                    // Use retirosForHybrid here!
                                    const totalHybrid = globalInicio + retirosForHybrid + d.depositos + d.saldoManual - d.restaManual - cazadoForCalc;
                                    this.hybridData = {
                                        ...d,
                                        saldoGlobal: globalInicio,
                                        retiros: retirosForHybrid, // Override retiros for Second Circle
                                        total: totalHybrid
                                    };
                                    this.hybridData = {
                                        ...d,
                                        saldoGlobal: globalInicio,
                                        retiros: retirosForHybrid, // Override retiros for Second Circle
                                        total: totalHybrid
                                    };
                                }

                                // NEW: Calculate difference (Second Circle - First Circle)
                                if (this.hybridData && this.liveData) {
                                    this.diferenciaSaldo = (this.hybridData.total || 0) - (this.liveData.total || 0);
                                }

                                // NEW 2: Calculate difference (Second Circle - Third Circle)
                                if (this.hybridData && this.liveData) {
                                    this.diferenciaVivo = (this.hybridData.total || 0) - (this.liveData.total || 0);
                                }

                                // NEW 3: Compute User Breakdown List
                                if (this.snapshot && this.snapshot.usuarios && d.usuarios) {
                                    const desglose = this.snapshot.usuarios
                                        .filter((usu: any) => (usu.saldoInicial || 0) > 0)
                                        .map((usu: any) => {
                                            const username = usu.username;
                                            const saldoInicial = usu.saldoInicial || 0;

                                            // 1. Current balance (from liveData usuarios)
                                            const foundLive = d.usuarios.find((u: any) => u.username === username);
                                            const tiene = foundLive ? (foundLive.saldoActual || 0) : 0;

                                            // 2. Apuestas
                                            const misApuestas = todasLasApuestas.filter(a => (a.username === username || a.usuario === username));
                                            let gana = 0;
                                            let pierde = 0;
                                            let aposto = 0;
                                            let vaJugando = 0;
                                            let enEspera = 0;
                                            let devuelto = 0;
                                            misApuestas.forEach(a => {
                                                const betAmount = Number(a.cantidadTotal || a.cantidad || a.monto || 0);
                                                aposto += betAmount;
                                                if (a.estado === 'pagada') {
                                                    gana += (betAmount * 0.9);
                                                } else if (a.estado === 'cazada' || a.estado === 'perdida') {
                                                    // Consider losing bets and currently matched (but unsettled) bets as negative value for calculation
                                                    pierde += betAmount;
                                                }

                                                if (a.estado === 'cazada') {
                                                    vaJugando += betAmount;
                                                } else if (a.estado === 'en_espera') {
                                                    enEspera += betAmount;
                                                } else if (a.estado === 'devuelta') {
                                                    devuelto += betAmount;
                                                }
                                            });

                                            // 3. Saldos manuales and Depositos
                                            let depositos = 0;
                                            let aumManual = 0;
                                            let restaMan = 0;

                                            // Using the already fetched `saldosRecords` unfiltered list
                                            const misSaldos = saldosRecords.filter(r => r.usuario === username || r.username === username);
                                            misSaldos.forEach(r => {
                                                const recordDate = new Date(r.fecha);
                                                if (recordDate >= startedAtDate) {
                                                    const amount = Number(r.saldo) || 0;
                                                    if (r.tipo === 'recarga') {
                                                        depositos += amount;
                                                    } else if (r.tipo === 'restar_saldo') {
                                                        restaMan += amount; // keep it positive here, subtract later
                                                    } else if (r.tipo !== 'retiro_aprobado') { // add_saldo or general
                                                        aumManual += amount;
                                                    }
                                                }
                                            });

                                            // 4. Retiros
                                            let retirosSuma = 0;
                                            const misRetiros = (retiros as any[]).filter(r => (r.username === username || r.usuario === username || r.usuario_enviar === username));
                                            misRetiros.forEach(r => {
                                                const fechaSol = new Date(r.fechaSolicitud);
                                                if (fechaSol >= startedAtDate && (r.estado === 'aprobado' || r.estado === 'pendiente')) {
                                                    const cant = typeof r.cantidad === 'string' ? Number(r.cantidad.replace(/[^0-9.]/g, '')) : Number(r.cantidad || 0);
                                                    retirosSuma += isNaN(cant) ? 0 : cant;
                                                }
                                            });

                                            // Math calculation
                                            const deberiaTener = saldoInicial + gana + depositos + aumManual - pierde - retirosSuma - restaMan;
                                            const tieneDeMas = tiene - deberiaTener;

                                            return {
                                                username,
                                                saldoInicial,
                                                gana,
                                                pierde,
                                                depositos,
                                                retiros: retirosSuma,
                                                aumManual,
                                                restaMan,
                                                tiene,
                                                deberiaTener,
                                                tieneDeMas,
                                                aposto,
                                                vaJugando,
                                                enEspera,
                                                devuelto
                                            };
                                        });

                                    // Sort to put negative "tieneDeMas" at the top
                                    desglose.sort((a: any, b: any) => a.tieneDeMas - b.tieneDeMas);

                                    this.usuariosDesglose = desglose;

                                    // Calculate the total of "tiene de mas" (which are represented as negative differences in deberiaTener logic)
                                    // Sum all the negative tieneDeMas values, but display them as a positive total.
                                    this.totalTieneDeMas = desglose.reduce((acc: number, u: any) => {
                                        return acc + (u.tieneDeMas < 0 ? Math.abs(u.tieneDeMas) : 0);
                                    }, 0);

                                    this.totalFalta = desglose.reduce((acc: number, u: any) => acc + (u.tieneDeMas > 0 ? u.tieneDeMas : 0), 0);
                                }


                            } catch (err) {
                                console.error('Error calculating corrected values:', err);
                                // Fallback logic if needed, or initialized variables above handle scoped access issue if defined outside try-catch
                            }
                        }
                    },
                    error: (err: any) => console.error('Error live data:', err)
                });
            },
            error: (err: any) => console.error('Error getting stream key:', err)
        });
    }

    confirmarFinalizar() {
        this.mostrarModalFinalizar = true;
    }

    cancelarFinalizar() {
        this.mostrarModalFinalizar = false;
    }

    finalizarStream() {
        this.usersService.finalizeStream(this.streamSeleccionado).subscribe({
            next: (res: any) => {
                if (res.success) {
                    this.finalSnapshot = res.data;
                    this.mostrarModalFinalizar = false;
                    // Force refresh to update view
                    this.cargarDatosInicio();
                }
            },
            error: (err: any) => console.error('Error finalizando stream:', err)
        });
    }

    // --- REINICIAR STREAM (RESET) ---

    confirmarReiniciar() {
        this.mostrarModalReiniciar = true;
    }

    cancelarReiniciar() {
        this.mostrarModalReiniciar = false;
    }

    reiniciarDatos() {
        let streamId = this.streamSeleccionado;
        // Robust ID extraction
        const match = streamId.match(/^Stream(\d+)/i);
        if (match) {
            streamId = match[1];
        }

        console.log('Reiniciando Stream ID:', streamId);

        this.usersService.resetStream(streamId).subscribe({
            next: (res: any) => {
                if (res.success) {
                    alert('Datos reiniciados correctamente. El stream está limpio.');
                    this.mostrarModalReiniciar = false;
                    // Recargar datos para limpiar la vista
                    this.cargarDatosInicio();
                    this.cargarDatosEnVivo(); // Esto limpiará liveData y finalSnapshot se irá al recargar inicio
                }
            },
            error: (err: any) => {
                console.error('Error reiniciando datos:', err);
                alert('Error al reiniciar datos. (Verifica si el servidor backend está actualizado)');
            }
        });
    }

    volver() {
        this.router.navigate(['/Admin']);
    }
}
