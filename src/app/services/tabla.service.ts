import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, fromEvent} from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TablaService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private baseUrl: string;

  // socket & subject para tiempo real
  public socket!: Socket;
  private tablaSubject = new BehaviorSubject<any>(null);

  constructor() {
    // Mantengo exactamente tu puerto: 444
    this.baseUrl = `${this.apiUrl}:444/api/tabla`;

    // conectar socket al mismo host/puerto (no cambio de puerto)
    const socketUrl = `${this.apiUrl}:444`;
    this.socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => console.log('TablaService socket connected', this.socket.id));
    this.socket.on('tablaPuntosActualizada', (payload: any) => {
      // emitir payload a suscriptores (componentes admin/invitado)
      this.tablaSubject.next(payload);
    });
  }


  // Observable para suscribirse a actualizaciones en tiempo real
  onTablaUpdates(): Observable<any> {
    return this.tablaSubject.asObservable();
  }

  // Obtener título actual (texto mostrado en el modal)
  getTitle(): Observable<{ title: string }> {
    return this.http.get<{ title: string }>(`${this.baseUrl}/title`);
  }

  // Guardar/actualizar título (backend debe persistir y opcionalmente emitir evento socket)
  setTitle(title: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/title`, { title });
  }

  // Obtener datos de la tabla (filas/plantilla)
  getTabla(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/data`);
  }

  saveTabla(data: any): Observable<any> {
    // Si pasaron solo un array de celdas, mantenemos la compatibilidad.
    // Si pasaron un objeto con rows/cols/tablaData/etc, lo enviamos tal cual.
    const payload = Array.isArray(data) ? { data } : data;
    return this.http.post<any>(`${this.baseUrl}/data`, payload);
}
  saveFullTabla(payload: any): Observable<any> {
    // Enviar el objeto tal cual; el backend acepta campos individuales o { data }
    return this.http.post<any>(`${this.baseUrl}/data`, payload);
  }
  
  // Opcional: endpoint para obtener configuración (filas, rondas, entrada)
  getConfig(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/config`);
  }
}