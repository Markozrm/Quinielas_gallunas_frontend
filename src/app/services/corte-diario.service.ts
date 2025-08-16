import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CorteDiarioService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${this.apiUrl}:444/api/corte-diario`;
  }

  // Obtener el resumen del corte diario para un stream específico
  getCorteDiario(stream: string): Observable<any> {
    return this.httpClient.get<any>(`${this.baseUrl}/${stream}`);
  }
  guardarCorteDiario(stream: string, datos: any) {
    return this.httpClient.post(`${this.baseUrl}/guardar`, { stream, datos });
  }
  getHistorialCortes(stream: string): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.baseUrl}/historial/${stream}`);
  }
}