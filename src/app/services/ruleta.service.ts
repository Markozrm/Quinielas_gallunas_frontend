import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { io, Socket } from 'socket.io-client';
@Injectable({
  providedIn: 'root'
})
export class RuletaService {
 
private readonly API_URL = `${environment.apiUrl}:444/api/ruleta`;
  private ruletaSocket: Socket;
  private saldoActualizado$ = new BehaviorSubject<number>(0);
  private username: string = 'BANCA'; // O el usuario actual
  constructor(private http: HttpClient) {
    this.ruletaSocket = io(`${environment.apiUrl}:446`, { transports: ['websocket'] });

    this.ruletaSocket.on('update_saldo', () => {
      this.fetchSaldo();
    });
  }

  fetchSaldo() {
    this.http.get<{ saldo: number }>(`/api/usuarios/saldo/${this.username}`)
      .subscribe(res => {
        this.saldoActualizado$.next(res.saldo);
      });
  }
    getPrices(sala: string = 'global'): Observable<{[key: number]: number}> {
  return this.http.get<{[key: number]: number}>(`${this.API_URL}/precios/${sala}`);
}
  setNumberPrice(numero: number, precio: number, sala: string = 'global'): Observable<any> {
    return this.http.post(`${this.API_URL}/precios`, {
      numero,
      precio,
      sala
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
 resetRuleta(sala: string = 'global'): Observable<any> {
    return this.http.post(`${this.API_URL}/reset`, { sala });
  }
  getPush(): Observable<any> {
    return this.http.get(`${this.API_URL}/push`);
  }
    getPurchases(sala: string): Observable<any> {
    return this.http.get(`${this.API_URL}/compras/${sala}`);
  }
}