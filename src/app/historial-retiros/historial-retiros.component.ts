import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuComponent } from '../menu/menu.component';
import { RetirosService } from '../services/retiros.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-historial-retiros',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  template: `
    <div class="historial-container">
      <div class="menuContainer">
        <app-menu></app-menu>
        <div>
          <button class="btn-volver" (click)="volver()">
            Volver
          </button>
        </div>
      </div>

      <div class="historial-content">
        <h1 class="titulo">Historial de Retiros</h1>
        
        <div *ngIf="loading" class="loading">
          Cargando historial...
        </div>

        <div *ngIf="!loading && retiros.length === 0" class="no-retiros">
          No tienes solicitudes de retiro.
        </div>

        <div class="retiros-list">
          <div *ngFor="let retiro of retiros" class="retiro-item" [ngClass]="getEstadoClase(retiro.estado)">
            <div class="retiro-header">
              <span class="fecha">{{ formatoFecha(retiro.fechaSolicitud) }}</span>
              <span class="estado-tag" [ngClass]="getEstadoClase(retiro.estado)">{{ retiro.estado | uppercase }}</span>
            </div>
            
            <div class="retiro-info">
              <div class="info-row">
                <span class="label">Cantidad:</span>
                <span class="value">{{ retiro.cantidad }}$</span>
              </div>
              <div class="info-row">
                <span class="label">Banco:</span>
                <span class="value">{{ retiro.banco }}</span>
              </div>
              <div class="info-row">
                <span class="label">Número/CLABE:</span>
                <span class="value">{{ retiro.numeroTarjeta }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .historial-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
    }

    .menuContainer {
      width: 100%;
      height: 10%;
      z-index: 9999;
      position: relative;
    }

    .btn-volver {
      background-color: #FFA500;
      color: #000;
      border: none;
      border-radius: 5px;
      padding: 8px 15px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 10000;
    }

    .historial-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      max-width: 600px;
      margin: 30px 0;
    }

    .titulo {
      color: #FFA500;
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 20px;
      text-align: center;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
      text-transform: uppercase;
    }

    .loading, .no-retiros {
      text-align: center;
      margin: 30px 0;
      font-size: 18px;
      color: #fff;
      background-color: rgba(0, 0, 0, 0.7);
      padding: 15px;
      border-radius: 8px;
      width: 100%;
    }

    .retiros-list {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 15px;
    }

    .retiro-item {
      background-color: #2a2a2a;
      border-radius: 10px;
      padding: 15px;
      width: 100%;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      border-left: 5px solid #FFA500;
    }

    .retiro-item.estado-pendiente {
      border-left-color: #FFC107;
    }

    .retiro-item.estado-aprobado {
      border-left-color: #4CAF50;
    }

    .retiro-item.estado-rechazado {
      border-left-color: #f44336;
    }

    .retiro-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 10px;
    }

    .fecha {
      font-size: 14px;
      color: #aaa;
    }

    .estado-tag {
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      color: #fff;
    }

    .estado-tag.estado-pendiente {
      background-color: #FFC107;
      color: #000;
    }

    .estado-tag.estado-aprobado {
      background-color: #4CAF50;
    }

    .estado-tag.estado-rechazado {
      background-color: #f44336;
    }

    .retiro-info {
      margin-bottom: 5px;
    }

    .info-row {
      display: flex;
      margin-bottom: 8px;
    }

    .label {
      font-weight: bold;
      width: 40%;
      color: #FFA500;
    }

    .value {
      width: 60%;
      color: #fff;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .historial-content {
        width: 90%;
      }
    }

    @media (max-width: 480px) {
      .titulo {
        font-size: 1.7rem;
      }
      
      .info-row {
        flex-direction: column;
      }
      
      .label, .value {
        width: 100%;
      }
      
      .label {
        margin-bottom: 5px;
      }
    }
  `]
})
export class HistorialRetirosComponent implements OnInit {
  retiros: any[] = [];
  loading: boolean = false;
  username: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private retirosService: RetirosService,
    private location: Location
  ) { }

  ngOnInit(): void {
    // Obtener el username de los parámetros de la URL o del localStorage
    this.route.queryParams.subscribe(params => {
      this.username = params['username'] || localStorage.getItem('nombreUsuario') || '';
      
      if (this.username) {
        this.cargarHistorialRetiros();
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  cargarHistorialRetiros(): void {
    this.loading = true;
    this.retirosService.getSolicitudesUsuario(this.username).subscribe(
      (data) => {
        this.retiros = this.ordenarRetiros(data);
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar el historial de retiros:', error);
        this.loading = false;
      }
    );
  }

  ordenarRetiros(retiros: any[]): any[] {
    // Primero ordenamos por fecha de más reciente a más antigua
    const porFecha = retiros.sort((a, b) => {
      return new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime();
    });
    
    // Luego ordenamos por estado, colocando 'pendiente' primero
    return porFecha.sort((a, b) => {
      if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
      if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
      return 0;
    });
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

  volver(): void {
    this.location.back();
  }
} 