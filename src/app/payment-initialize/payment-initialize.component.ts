import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PaymentService } from '../services/payment.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-payment-initialize',
  template: `
    <div class="container">
      <h2>Inicializando datos de pago</h2>
      <p>{{ message }}</p>
      <button *ngIf="showBackButton" (click)="goBack()" class="back-btn">Volver</button>
    </div>
  `,
  styles: [`
    .container {
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    h2 {
      color: #333;
      margin-bottom: 20px;
    }
    p {
      color: #666;
      margin-bottom: 20px;
    }
    .back-btn {
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 20px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    .back-btn:hover {
      background-color: #0056b3;
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class PaymentInitializeComponent implements OnInit {
  message: string = 'Inicializando datos de pago...';
  showBackButton: boolean = false;
  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.initializePaymentData();
  }

  initializePaymentData(): void {
    // Verificar si el usuario es administrador
    const rol = localStorage.getItem("Rol") || "";
    if (rol !== 'superUsuario' && rol !== 'administrador') {
      this.message = 'No tienes permisos para realizar esta acción';
      this.showBackButton = true;
      return;
    }

    this.http.post(`${this.apiUrl}:444/api/payments/initialize`, {}).subscribe(
      (response: any) => {
        this.message = response.message || 'Datos inicializados correctamente';
        this.showBackButton = true;
      },
      error => {
        this.message = error.error?.message || 'Error al inicializar datos de pago';
        this.showBackButton = true;
      }
    );
  }

  goBack(): void {
    this.router.navigate(['/pago-page']);
  }
} 