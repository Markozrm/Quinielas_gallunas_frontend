import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuComponent } from '../menu/menu.component';
import { Location } from '@angular/common';
import { RetirosService } from '../services/retiros.service';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-retirar-saldo',
  templateUrl: './retirar-saldo.component.html',
  styleUrls: ['./retirar-saldo.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent]
})
export class RetirarSaldoComponent implements OnInit {
  retiroForm: FormGroup;
  username: string = '';
  saldoActual: number = 0;
  loading: boolean = false;
  mensajeExito: string = '';
  mensajeError: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private location: Location,
    private retirosService: RetirosService,
    private usersService: UsersService
  ) {
    this.retiroForm = this.fb.group({
      banco: ['', Validators.required],
      cantidad: ['', [Validators.required, Validators.min(1)]],
      nombreTitular: ['', Validators.required],
      numeroTarjeta: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Obtener el nombre de usuario del localStorage
    this.username = localStorage.getItem('nombreUsuario') || '';
    
    // Si no hay usuario, redirigir al login
    if (!this.username) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Cargar el saldo actual del usuario
    this.cargarSaldo();
  }

  cargarSaldo(): void {
    this.usersService.getSaldo(this.username).subscribe(
      (data) => {
        this.saldoActual = data.saldo;
      },
      (error) => {
        console.error('Error al cargar el saldo:', error);
        this.mensajeError = 'Error al cargar el saldo. Inténtalo de nuevo.';
      }
    );
  }

  onSubmit(): void {
    if (this.retiroForm.invalid) {
      return;
    }

    const cantidad = this.retiroForm.value.cantidad;
    
    // Validar que la cantidad sea menor o igual al saldo disponible
    if (cantidad > this.saldoActual) {
      this.mensajeError = 'La cantidad solicitada excede tu saldo disponible';
      return;
    }

    this.loading = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const solicitud = {
      ...this.retiroForm.value,
      username: this.username
    };

    this.retirosService.solicitarRetiro(solicitud).subscribe(
      (respuesta) => {
        this.loading = false;
        this.mensajeExito = 'Solicitud de retiro enviada exitosamente';
        // Actualizar el saldo después de la solicitud exitosa
        this.cargarSaldo();
        // Limpiar el formulario
        this.retiroForm.reset();
        
        // Mostrar el mensaje de éxito por 3 segundos y luego redirigir
        setTimeout(() => {
          this.router.navigate(['/mi-perfil']);
        }, 3000);
      },
      (error) => {
        this.loading = false;
        this.mensajeError = error.error.error || 'Error al procesar la solicitud. Inténtalo de nuevo.';
        console.error('Error al solicitar retiro:', error);
      }
    );
  }

  volver(): void {
    this.location.back();
  }
}
