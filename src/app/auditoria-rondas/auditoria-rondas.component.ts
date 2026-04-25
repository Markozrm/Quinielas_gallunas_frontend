/* The `AuditoriaRondasComponent` class is an Angular component that displays audit information for
rounds in a gaming platform, with the ability to switch between different platforms and
automatically refresh data. */
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { apuestaService } from 'src/app/services/apuestas.service';

@Component({
  selector: 'app-auditoria-rondas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditoria-rondas.component.html',
  styleUrls: ['./auditoria-rondas.component.css']
})
export class AuditoriaRondasComponent implements OnInit, OnDestroy {

  // ─── Inputs ────────────────────────────────────────────────────────────────
  // [sala]        → código del stream actual (viene del componente padre)
  // [plataforma]  → 'galluno' | 'plumass' — determina qué endpoints usar
  @Input() sala: string = '';
  @Input() plataforma: 'galluno' | 'plumass' = 'galluno';
  @Output() cerrar = new EventEmitter<void>();

  // ─── Estado ────────────────────────────────────────────────────────────────
  salaManual: string = '';
  salaActiva: string = '';
  tabActivo: 'resumen' | 'alertas' = 'resumen';
  cargando = false;
  error: string = '';
  rondas: any[] = [];
  alertas: any[] = [];
  totalProblemas = 0;

  private intervalo: any;

  constructor(private apuestaService: apuestaService) {}

  ngOnInit() {
    if (this.sala) {
      this.salaActiva = this.sala;
      this.cargar();
      // Refrescar automáticamente cada 30s
      this.intervalo = setInterval(() => this.cargar(), 30000);
    }
  }

  ngOnDestroy() {
    if (this.intervalo) clearInterval(this.intervalo);
  }

  cargar() {
    const sala = this.salaActiva || this.salaManual;
    if (!sala) return;
    this.salaActiva = sala;
    this.cargando = true;
    this.error = '';

    if (this.plataforma === 'galluno') {
      this.cargarGalluno(sala);
    } else {
      this.cargarPlumass(sala);
    }
  }

  private cargarGalluno(sala: string) {
    const svc = this.apuestaService as any;
    Promise.all([
      svc.obtenerAuditoriaStream(sala).toPromise().catch(() => null),
      svc.obtenerAlertasAuditoria(sala).toPromise().catch(() => null)
    ]).then(([streamRes, alertasRes]: any[]) => {
      this.cargando = false;
      if (streamRes) {
        this.rondas = streamRes.detalle || [];
        this.totalProblemas = streamRes.rondas_con_problema || 0;
      }
      if (alertasRes) {
        this.alertas = alertasRes.alertas || [];
      }
    }).catch(() => {
      this.cargando = false;
      this.error = 'Error al cargar auditoría. Verifica que el backend esté activo.';
    });
  }

  private cargarPlumass(sala: string) {
    const svc = this.apuestaService as any;
    Promise.all([
      svc.obtenerBalanceStream(sala).toPromise().catch(() => null),
      svc.obtenerAlertasBalance(sala).toPromise().catch(() => null)
    ]).then(([streamRes, alertasRes]: any[]) => {
      this.cargando = false;
      if (streamRes) {
        this.rondas = streamRes.detalle || [];
        this.totalProblemas = streamRes.rondas_con_problema || 0;
      }
      if (alertasRes) {
        this.alertas = alertasRes.alertas || [];
      }
    }).catch(() => {
      this.cargando = false;
      this.error = 'Error al cargar auditoría. Verifica que el backend esté activo.';
    });
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('auditoria-overlay')) {
      this.cerrar.emit();
    }
  }

  get absNum() {
    return Math.abs;
  }
}