import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RetirosService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${this.apiUrl}:444/api/retiros`;
  }

  // Solicitar un nuevo retiro de saldo
  solicitarRetiro(datos: {
    username: string;
    banco: string;
    cantidad: number;
    nombreTitular: string;
    numeroTarjeta: string;
  }): Observable<any> {
    return this.httpClient.post<any>(`${this.baseUrl}/solicitar`, datos);
  }

  // Obtener las solicitudes de retiro de un usuario específico
  getSolicitudesUsuario(username: string): Observable<any> {
    return this.httpClient.get<any>(`${this.baseUrl}/usuario/${username}`);
  }

  // Obtener todas las solicitudes (para administradores)
  getAllSolicitudes(): Observable<any> {
    return this.httpClient.get<any>(`${this.baseUrl}`);
  }

  // Aprobar una solicitud de retiro (para administradores)
  aprobarSolicitud(id: string): Observable<any> {
    return this.httpClient.put<any>(`${this.baseUrl}/aprobar/${id}`, {});
  }

  // Rechazar una solicitud de retiro (para administradores)
  rechazarSolicitud(id: string): Observable<any> {
    return this.httpClient.put<any>(`${this.baseUrl}/rechazar/${id}`, {});
  }

  // Eliminar una solicitud de retiro (para administradores)
  eliminarSolicitud(id: string): Observable<any> {
    return this.httpClient.delete<any>(`${this.baseUrl}/${id}`);
  }
} 