import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuComponent } from '../menu/menu.component';
import { RetirosService } from '../services/retiros.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-ver-retiros',
  templateUrl: './ver-retiros.component.html',
  styleUrls: ['./ver-retiros.component.css'],
  standalone: true,
  imports: [CommonModule, MenuComponent]
})
export class VerRetirosComponent implements OnInit {
  retiros: any[] = [];
  loading: boolean = false;
  mostrarModalConfirmar: boolean = false;
  mostrarModalDobleConfirmar: boolean = false;
  retiroSeleccionado: any = null;
  retirosPendientes: number = 0;
  cantidadAcumulada: number = 0;
  expresHabilitado: boolean = true;
  togglingExpres: boolean = false;

  constructor(
    private retirosService: RetirosService,
    private router: Router,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.cargarRetiros();
    this.cargarConfiguracion();
  }

  cargarConfiguracion(): void {
    this.retirosService.getConfiguracion().subscribe(
      (cfg) => { this.expresHabilitado = !!cfg.expresHabilitado; },
      (error) => { console.error('Error cargando configuración de retiros:', error); }
    );
  }

  toggleExpres(): void {
    const nuevoValor = !this.expresHabilitado;
    const accion = nuevoValor ? 'ACTIVAR' : 'DESACTIVAR';
    if (!confirm(`¿${accion} los retiros EXPRÉS para todos los usuarios?`)) return;

    this.togglingExpres = true;
    this.retirosService.setExpresHabilitado(nuevoValor).subscribe(
      (cfg) => {
        this.expresHabilitado = !!cfg.expresHabilitado;
        this.togglingExpres = false;
      },
      (error) => {
        this.togglingExpres = false;
        alert('Error al cambiar la configuración: ' + (error?.error?.error || error.message));
      }
    );
  }

  cargarRetiros(): void {
    this.loading = true;
    this.retirosService.getAllSolicitudes().subscribe(
      (data) => {
        this.retiros = this.ordenarRetiros(data);
        this.retirosPendientes = this.retiros.filter(r => r.estado === 'pendiente').length;
        this.cantidadAcumulada = this.retiros
          .filter(r => r.estado === 'pendiente')
          .reduce((acc, r) => {
            let cantidad = 0;
            if (typeof r.cantidad === 'string') {
              cantidad = Number(r.cantidad.replace(/[^0-9.]/g, ''));
            } else {
              cantidad = Number(r.cantidad || 0);
            }
            return acc + (isNaN(cantidad) ? 0 : cantidad);
          }, 0);
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar las solicitudes de retiro:', error);
        this.loading = false;
      }
    );
  }

  ordenarRetiros(retiros: any[]): any[] {
    const porFecha = retiros.sort((a, b) => {
      return new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime();
    });

    return porFecha.sort((a, b) => {
      if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
      if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
      return 0;
    });
  }

  volver(): void {
    this.location.back();
  }

  formatoFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX');
  }

  getEstadoClase(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'estado-pendiente';
      case 'aprobado':
        return 'estado-aprobado';
      case 'rechazado':
        return 'estado-rechazado';
      default:
        return '';
    }
  }

  aprobar(id: string): void {
    if (confirm('¿Estás seguro de que deseas aprobar esta solicitud de retiro?')) {
      this.retirosService.aprobarSolicitud(id).subscribe(
        () => {
          alert('Solicitud aprobada exitosamente');
          this.cargarRetiros();
        },
        (error) => {
          alert('Error al aprobar la solicitud: ' + error.error.error);
          console.error('Error al aprobar la solicitud:', error);
        }
      );
    }
  }

  rechazar(id: string): void {
    if (confirm('¿Estás seguro de que deseas rechazar esta solicitud de retiro? El saldo será devuelto al usuario.')) {
      this.retirosService.rechazarSolicitud(id).subscribe(
        () => {
          alert('Solicitud rechazada exitosamente');
          this.cargarRetiros();
        },
        (error) => {
          alert('Error al rechazar la solicitud: ' + error.error.error);
          console.error('Error al rechazar la solicitud:', error);
        }
      );
    }
  }

  confirmarEliminar(retiro: any): void {
    this.retiroSeleccionado = retiro;
    this.mostrarModalConfirmar = true;
  }

  confirmarPrimerPaso(): void {
    this.mostrarModalConfirmar = false;
    this.mostrarModalDobleConfirmar = true;
  }

  confirmarSegundoPaso(): void {
    if (this.retiroSeleccionado) {
      this.retirosService.eliminarSolicitud(this.retiroSeleccionado._id).subscribe(
        () => {
          this.cerrarModales();
          alert('Solicitud eliminada exitosamente');
          this.cargarRetiros();
        },
        (error) => {
          this.cerrarModales();
          alert('Error al eliminar la solicitud: ' + error.error.error);
          console.error('Error al eliminar la solicitud:', error);
        }
      );
    }
  }

  cerrarModales(): void {
    this.mostrarModalConfirmar = false;
    this.mostrarModalDobleConfirmar = false;
    this.retiroSeleccionado = null;
  }
}
