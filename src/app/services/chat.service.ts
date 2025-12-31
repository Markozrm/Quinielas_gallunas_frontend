import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Subject, interval } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  public socket: Socket;
  
  // Subjects para polling de imágenes
  private streamImageSubject = new Subject<{ imageUrl: string }>();
  private streamImageRemovedSubject = new Subject<void>();
  
  public streamImage$ = this.streamImageSubject.asObservable();
  public streamImageRemoved$ = this.streamImageRemovedSubject.asObservable();

  private lastImageTimestamp: Date | null = null;
  private pollingInterval: any = null;

  constructor(private http: HttpClient) {
    this.socket = io(`${environment.apiUrl}:444`); // PUERTO 444
    this.startImagePolling();
  }

  // MÉTODOS DE POLLING PARA IMÁGENES
  private startImagePolling() {
    this.pollingInterval = setInterval(() => {
      this.checkForNewImage();
    }, 3000);
  }

  private checkForNewImage() {
    // USAR LA RUTA CORRECTA PARA OVERLAY:
    this.http.get(`${environment.apiUrl}:444/api/streams/imagen-overlay/1`).subscribe({
      next: (response: any) => {
        if (response.hasImage) {
          const newTimestamp = new Date(response.timestamp);
          
          if (!this.lastImageTimestamp || newTimestamp > this.lastImageTimestamp) {
            this.lastImageTimestamp = newTimestamp;
            console.log('[POLLING] Nueva imagen overlay detectada:', response.imageUrl);
            const fullImageUrl = `${environment.apiUrl}:444${response.imageUrl}`;
            // ...ya incluye el timestamp en la URL, así que solo úsala directamente:
            this.streamImageSubject.next({ imageUrl: fullImageUrl });
          }
        } else {
          if (this.lastImageTimestamp) {
            console.log('[POLLING] Imagen overlay removida');
            this.lastImageTimestamp = null;
            this.streamImageRemovedSubject.next();
          }
        }
      },
      error: (error) => {
        console.error('Error en polling de imagen overlay:', error);
      }
    });
  }

  // MÉTODOS DE SOCKET.IO (AGREGAR ESTOS):
  public joinRoom(room: string, username: string) {
    this.socket.emit('join_room', { room, username });
  }

  public leaveRoom() {
    this.socket.emit('leave_room');
  }

  public initChat() {
    // Socket.IO se conecta automáticamente al crear la instancia
    // Este método existe para compatibilidad con el código existente
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  // MÉTODO DE LIMPIEZA
  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}