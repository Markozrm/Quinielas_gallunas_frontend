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

                                // 2. FIX SALDO MANUAL: Matches HistorialSaldosService logic
                                const startedAtDate = new Date(d.startedAt);
                                const saldoManualReal = saldosRecords
                                    .filter(r => {
                                        const recordDate = new Date(r.fecha);
                                        return recordDate >= startedAtDate &&
                                            r.tipo !== 'recarga' &&
                                            r.tipo !== 'restar_saldo';
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
                                if (this.snapshot && this.hybridData) {
                                    this.diferenciaSaldo = (this.hybridData.total || 0) - (this.snapshot.total || 0);
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
