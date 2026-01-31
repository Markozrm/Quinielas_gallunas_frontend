import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { apuestaService } from '../../services/apuestas.service';
import { MenuComponent } from '../../menu/menu.component';

@Component({
    selector: 'app-tablas-apuestas-h',
    standalone: true,
    imports: [CommonModule, FormsModule, MenuComponent],
    templateUrl: './tablas-apuestas-h.component.html',
    styleUrls: ['./tablas-apuestas-h.component.css']
})
export class TablasApuestasHComponent {
    fecha: string = '';
    ronda: number | null = null;

    apuestasVerde: any[] = [];
    apuestasRojo: any[] = [];
    apuestasDevueltas: any[] = [];

    totalVerde: number = 0;
    totalRojo: number = 0;
    totalDevuelto: number = 0;

    constructor(private apuestaService: apuestaService) { }

    buscar() {
        if (!this.fecha || !this.ronda) {
            alert('Seleccione fecha y ronda');
            return;
        }
        // Input date is usually YYYY-MM-DD. Backend expects DD-MM-YYYY.
        const parts = this.fecha.split('-');
        let fechaFormatted = this.fecha;
        if (parts.length === 3) {
            fechaFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        this.apuestaService.obtenerHistorialPorFecha(fechaFormatted, this.ronda).subscribe({
            next: (data) => {
                this.procesarApuestas(data);
            },
            error: (err) => {
                console.error(err);
                alert('Error al buscar apuestas');
            }
        });
    }

    procesarApuestas(apuestas: any[]) {
        // Filter by green/red. Note: backend model has 'verde' string or 'rojo' string field populated if bet is on that color.
        // Usually only one is populated.

        this.apuestasVerde = apuestas.filter(a => a.verde && a.estado !== 'devuelta');
        this.apuestasRojo = apuestas.filter(a => a.rojo && a.estado !== 'devuelta');
        this.apuestasDevueltas = apuestas.filter(a => a.estado === 'devuelta');

        this.totalVerde = this.apuestasVerde.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);
        this.totalRojo = this.apuestasRojo.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);
        this.totalDevuelto = this.apuestasDevueltas.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);
    }
}
