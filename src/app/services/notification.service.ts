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
    this.socket = io(`${environment.apiUrl}:444`, { transports: ['websocket'] });
    this.inicializarSocket();
    this.actualizarPendientes(); // Inicializa el contador al cargar
  }

  private solicitarPermisoNotificaciones() {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }

  private inicializarSocket() {
    const rol = localStorage.getItem('Rol');
    if (
      rol === 'superUsuario' ||
      rol === 'controladorBanca'
    ) {
      this.socket.on('nuevo_recibo', (data) => {
        this.pendientes++;
        this.mostrarNotificacionRecibo(data);
      });
    }
  }

  // Llama a este método desde los componentes cuando se acepta o rechaza un recibo
  public restarPendiente() {
    if (this.pendientes > 0) this.pendientes--;
  }

  // Llama a este método al iniciar para obtener el número real de pendientes
  private actualizarPendientes() {
    fetch(`${environment.apiUrl}:444/api/recipes/get-all-recipes`)
      .then(res => res.json())
      .then((recibos: any[]) => {
        this.pendientes = recibos.filter(r => r.estado === 'pendiente' || !r.estado).length;
      });
  }

  private mostrarNotificacionRecibo(data: any) {
    const mensaje = `Tienes ${this.pendientes} recibo(s) pendiente(s) por aceptar.`;
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Nuevo comprobante de recarga', {
        body: mensaje + '\n¡Haz clic para ver los recibos pendientes!',
        icon: 'assets/icono-notificacion.png'
      });

      // Reproduce sonido
      const audio = new Audio('assets/game-bonus-02-294436.mp3');
      audio.play();

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
      audio.play();
    }
  }
}