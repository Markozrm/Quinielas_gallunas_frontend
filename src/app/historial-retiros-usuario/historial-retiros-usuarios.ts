import { Component, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { RetirosService } from '../services/retiros.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-historial-retiros-usuarios',
  templateUrl: './historial-retiros-usuarios.html',
  styleUrls: ['./historial-retiros-usuarios.css'],
  standalone: true,
  imports: [CommonModule, NgClass]
})
export class HistorialRetirosUsuariosComponent implements OnInit {
  retiros: any[] = [];
  nombreUsuario: string = '';

  constructor(
    private retirosService: RetirosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.nombreUsuario = localStorage.getItem('nombreUsuario') || '';
    this.cargarRetirosAprobados();
  }

  cargarRetirosAprobados(): void {
    this.retirosService.getSolicitudesUsuario(this.nombreUsuario).subscribe(
      (data: any[]) => {
        // Filtra retiros aprobados, rechazados y pendientes
        this.retiros = data.filter(
          r => r.estado === 'aprobado' || r.estado === 'rechazado' || r.estado === 'pendiente'
        );
      },
      (error) => {
        console.error('Error al cargar los retiros:', error);
      }
    );
  }

  volverAlPerfil(): void {
    this.router.navigate(['/mi-perfil']);
  }

  getTotalAprobado(): number {
    return this.retiros
      .filter(r => r.estado === 'aprobado')
      .reduce((acc, r) => acc + Number(r.cantidad), 0);
  }

  getTotalRechazado(): number {
    return this.retiros
      .filter(r => r.estado === 'rechazado')
      .reduce((acc, r) => acc + Number(r.cantidad), 0);
  }
}