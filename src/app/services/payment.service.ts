import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${this.apiUrl}:444/api/payments`;
  }

  getAllPaymentInfo(): Observable<any> {
    return this.httpClient.get<any>(`${this.baseUrl}/get-all`);
  }

  updatePaymentInfo(id: string, data: any): Observable<any> {
    return this.httpClient.put<any>(`${this.baseUrl}/update/${id}`, data);
  }
} 