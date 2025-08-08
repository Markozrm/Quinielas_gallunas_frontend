import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, animate, transition } from '@angular/animations';

export interface NotificacionType {
  tipo: string;
  mensaje: string;
  detalles: {
    cantidad: number;
    cantidadOriginal?: number; // Cantidad original de la apuesta
    cantidadDevuelta?: number; // Cantidad devuelta al usuario
    cantidadCazada?: number;   // Cantidad por la que se cazó la apuesta
    ronda: number;
    sala: string;
    fecha: Date;
  }
}

@Component({
  selector: 'app-notificacion-personal',
  templateUrl: './notificacion-personal.component.html',
  styleUrls: ['./notificacion-personal.component.css'],
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('notificacionState', [
      state('visible', style({
        opacity: 1,
        transform: 'translateY(0)'
      })),
      state('hidden', style({
        opacity: 0,
        transform: 'translateY(-20px)'
      })),
      transition('hidden => visible', [
        animate('300ms ease-in')
      ]),
      transition('visible => hidden', [
        animate('300ms ease-out')
      ])
    ])
  ]
})
export class NotificacionPersonalComponent implements OnInit {
  @Input() notificacion: NotificacionType | null = null;
  @Output() cerrarNotificacion = new EventEmitter<void>();
  
  animationState: 'visible' | 'hidden' = 'hidden';
  
  ngOnInit(): void {
    this.checkNotificacion();
  }
  
  ngOnChanges(): void {
    this.checkNotificacion();
  }
  
  private checkNotificacion(): void {
    console.log('Verificando notificación:', this.notificacion);
    if (this.notificacion) {
      console.log('Notificación presente, mostrando...');
      this.animationState = 'visible';
    } else {
      console.log('Sin notificación, ocultando...');
      this.animationState = 'hidden';
    }
  }
  
  cerrar(): void {
    console.log('Cerrando notificación desde el componente');
    this.animationState = 'hidden';
    setTimeout(() => {
      this.cerrarNotificacion.emit();
    }, 300); // Esperar a que termine la animación
  }
  
  getTipoIcono(): string {
    if (!this.notificacion) return '';
    
    switch (this.notificacion.tipo) {
      case 'ganancia':
        return '💰';
      case 'perdida':
        return '❌';
      case 'informacion':
        return 'ℹ️';
      case 'Apuesta cazada':
        return '🤝';
      case 'Apuesta cazada parcialmente':
        return '💱';
      default:
        return '📢';
    }
  }
  
  getTipoClase(): string {
    if (!this.notificacion) return '';
    
    switch (this.notificacion.tipo) {
      case 'ganancia':
        return 'notificacion-ganancia';
      case 'perdida':
        return 'notificacion-perdida';
      case 'informacion':
        return 'notificacion-info';
      case 'Apuesta cazada':
        return 'notificacion-cazada';
      case 'Apuesta cazada parcialmente':
        return 'notificacion-cazada-parcial';
      default:
        return 'notificacion-default';
    }
  }
} 