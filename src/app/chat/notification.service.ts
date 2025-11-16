import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class NotificacionGlobalService {
  private socket: Socket;
  private pendientes: number = 0;

  constructor(private router: Router) {
    this.solicitarPermisoNotificaciones();
    const socketBase = this.getSocketBaseUrl();
    this.socket = io(socketBase, { transports: ['websocket'] });
    this.inicializarSocket();
    this.actualizarPendientes();
  }

  private solicitarPermisoNotificaciones() {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }

  // Construye la URL base para socket / fetch respetando puertos ya presentes en environment.apiUrl
  private getSocketBaseUrl(): string {
    // usar los puertos definidos en environment (PORT, apuesta_PORT, ...) y si no existen usar '444'
    const defaultSocketPort = (environment as any).PORT || (environment as any).apuesta_PORT || '444';
    const api = (environment.apiUrl || '').trim();

    try {
      const url = new URL(api);
      // Si apiUrl ya tiene puerto devuelve su origen (incluye puerto)
      if (url.port) {
        return url.origin;
      }
      // Si no tiene puerto, usa hostname con puerto de socket (o el por defecto)
      return `${url.protocol}//${url.hostname}:${defaultSocketPort}`;
    } catch {
      // environment.apiUrl podría ser solo "host:port" o "host"
      if (api.includes(':')) {
        // ya contiene puerto -> asegurar esquema
        return api.startsWith('http') ? api : `http://${api}`;
      }
      return `http://${api}:${defaultSocketPort}`;
    }
  }

  private inicializarSocket() {
    const rol = localStorage.getItem('Rol');
    if (rol === 'superUsuario' || rol === 'controladorBanca') {
      this.socket.on('nuevo_recibo', (data) => {
        this.pendientes++;
        this.mostrarNotificacionRecibo(data);
      });
    }
  }

  public restarPendiente() {
    if (this.pendientes > 0) this.pendientes--;
  }

  private async actualizarPendientes() {
    const base = this.getSocketBaseUrl();
    const url = `${base.replace(/\/$/, '')}/api/recipes/get-all-recipes`;
    try {
      const res = await fetch(url);
      const recibos: any[] = await res.json();
      this.pendientes = recibos.filter(r => r.estado === 'pendiente' || !r.estado).length;
    } catch {
      // silencioso en fallo de fetch
    }
  }

  private mostrarNotificacionRecibo(data: any) {
    const mensaje = `Tienes ${this.pendientes} recibo(s) pendiente(s) por aceptar.`;
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Nuevo comprobante de recarga', {
        body: mensaje + '\n¡Haz clic para ver los recibos pendientes!',
        icon: 'assets/icono-notificacion.png'
      });

      const audio = new Audio('assets/game-bonus-02-294436.mp3');
      audio.play().catch(() => {});

      notification.onclick = () => {
        window.focus();
        this.router.navigate(['/ver-recibos']);
        notification.close();
      };
    } else {
      if (confirm(mensaje + '\n¿Ir a ver recibos?')) {
        this.router.navigate(['/ver-recibos']);
      }
      const audio = new Audio('assets/game-bonus-02-294436.mp3');
      audio.play().catch(() => {});
    }
  }
}