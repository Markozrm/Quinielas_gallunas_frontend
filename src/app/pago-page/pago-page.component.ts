import { Component, OnInit } from '@angular/core';
import { MenuComponent } from '../menu/menu.component';
import { Router } from '@angular/router';
import { ClipboardService } from 'ngx-clipboard'
import { MembershipModalComponent } from '../membership-modal/membership-modal.component';
import {NgIf, NgFor, NgClass } from '@angular/common';
import { Location } from '@angular/common';
import { UsersService } from '../services/users.service';
import { PaymentService } from '../services/payment.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pago-page',
  templateUrl: './pago-page.component.html',
  styleUrls: ['./pago-page.component.css'],
  standalone:true,
  imports:[MenuComponent,MembershipModalComponent,NgIf,NgFor,NgClass, FormsModule],
})
export class PagoPageComponent implements OnInit {

  showModal: boolean = false;
  saldo:number = 0;
  username:string = localStorage.getItem("nombreUsuario") || ""
  paymentInfo: any[] = [];
  editingPayment: any = null;

  constructor(
    private userService:UsersService,
    private paymentService: PaymentService,
    private location: Location,
    private router: Router, 
    private _clipboardService: ClipboardService) {

      this.userService.getSaldo(this.username).subscribe(response => {
        this.saldo = response.saldo;
      });
      
    }

  ngOnInit() {
    this.loadPaymentInfo();
  }

  loadPaymentInfo() {
    this.paymentService.getAllPaymentInfo().subscribe(
      data => {
        this.paymentInfo = data;
      },
      error => {
        console.error('Error cargando información de pago:', error);
        // Si no hay datos iniciales, inicializar
        if (this.esAdmin()) {
          this.initializePaymentData();
        }
      }
    );
  }

  initializePaymentData() {
    // Solo los administradores pueden inicializar datos
    this.router.navigate(['/admin/initialize-payment']);
  }

  irEnviarRecibo(){
    this.router.navigate(['/Subir-recibo']);
  }
  Volver(){
    this.location.back(); // Navegar a la última ruta visitada
  }

  copiarTexto(text: string){
    this._clipboardService.copy(text)
  }

 /*openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }*/

  esAdmin(): boolean {
    const rol = localStorage.getItem("Rol") || "";
    return rol === 'superUsuario' || rol === 'administrador';
  }

  startEditing(payment: any) {
    // Verificar si el usuario es Recio antes de permitir la edición
    if (this.username !== 'Recio') {
      alert('No tienes permisos para editar la información de pagos');
      return;
    }
    
    this.editingPayment = {
      ...payment
    };
  }

  cancelEditing() {
    this.editingPayment = null;
  }

  savePaymentChanges() {
    if (this.username !== 'Recio') {
      alert('No tienes permisos para editar la información de pagos');
      return;
    }
    if (!this.editingPayment) return;

    this.paymentService.updatePaymentInfo(this.editingPayment.id, this.editingPayment).subscribe(
      response => {
        // Actualizar el array local con los nuevos datos
        const index = this.paymentInfo.findIndex(p => p.id === this.editingPayment.id);
        if (index !== -1) {
          this.paymentInfo[index] = response;
        }
        this.editingPayment = null;
      },
      error => {
        console.error('Error actualizando información de pago:', error);
      }
    );
  }
  copiarDatosBancarios() {
  const datos = `BENEFICIARIO: PLUMASS\n` +
                `NUMERO DE TARJETA: 5101 2552 7066 4060\n` +
                `CLABE: 638180000196608239\n` +
                `BANCO: NU MEXICO (SPEI)\n` +
                `CONCEPTO: TRANSFERENCIA`;
  
  this._clipboardService.copy(datos);
  
  //Mostrar notificación
  alert('Datos bancarios copiados al portapapeles');
}
}
