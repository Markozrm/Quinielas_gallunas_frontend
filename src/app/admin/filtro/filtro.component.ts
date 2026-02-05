import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService } from '../../services/users.service';

@Component({
    selector: 'app-filtro',
    standalone: true,
    imports: [CommonModule, FormsModule, DecimalPipe, CurrencyPipe, DatePipe],
    templateUrl: './filtro.component.html',
    styleUrls: ['./filtro.component.css']
})
export class FiltroComponent implements OnInit {

    snapshot: any = null;
    liveData: any = null;
    finalSnapshot: any = null;
    loading = true;
    streamSeleccionado: string = '1';
    intervalId: any;
    mostrarModalFinalizar: boolean = false;

    constructor(private router: Router, private usersService: UsersService) { }

    ngOnInit() {
        this.cargarDatosInicio();
        this.cargarDatosEnVivo(); // Initial Load
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
                } else {
                    this.snapshot = null;
                    this.finalSnapshot = null;
                }
                this.loading = false;
            },
            error: (err: any) => {
                console.error('Error cargando snapshot:', err);
                this.loading = false;
            }
        });
    }

    cargarDatosEnVivo() {
        this.usersService.getStreamLiveData(this.streamSeleccionado).subscribe({
            next: (res: any) => {
                if (res.success && res.data) {
                    /*
                      Formula: Global + Retiros + Depositos + Manual - Resta - Cazado = TOTAL
                      Note: 'Cazado' behavior was "saldo cazado en vivo *.10".
                      If we assume 'Total' is the result of the equation, we do the math here.
                    */
                    const d = res.data;
                    const cazadoAdjusted = d.cazado; // Use raw or adjusted? Assuming RAW substraction based on image formula
                    // Or "Cazado * .10"?
                    // User said: "+ saldo cazado en vivo *.10 = total".
                    // The image text says: "... - CAZADO = TOTAL".
                    // I will implement the image formula: Global + Retiros + Depositos + Manual - Resta - Cazado.
                    // But I'll display Cazado.
                    // Wait, if user wants "* .10", I will calculate total with * .10?
                    // Let's stick to the image formula for the "Total" display, but maybe display "Cazado" raw.
                    // Actually, if I look at the image `105,650` everywhere, it's dummy data.
                    // The safest bet is `Global + Retiros + Depositos + Manual - Resta - Cazado`.

                    const total = d.saldoGlobal + d.retiros + d.depositos + d.saldoManual - d.restaManual - d.cazado;

                    this.liveData = { ...d, total };
                }
            },
            error: (err: any) => console.error('Error live data:', err)
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
                }
            },
            error: (err: any) => console.error('Error finalizando stream:', err)
        });
    }

    // --- REINICIAR STREAM (RESET) ---
    mostrarModalReiniciar: boolean = false;

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
