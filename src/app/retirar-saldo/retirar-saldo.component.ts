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
  expresHabilitado: boolean = true;

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
      numeroTarjeta: ['', Validators.required],
      tipo: ['normal', Validators.required]
    });
  }

  get esExpres(): boolean {
    return this.retiroForm.get('tipo')?.value === 'expres';
  }

  get comisionExpres(): number {
    const c = Number(this.retiroForm.get('cantidad')?.value || 0);
    return this.esExpres ? +(c * 0.03).toFixed(2) : 0;
  }

  get montoEntregar(): number {
    const c = Number(this.retiroForm.get('cantidad')?.value || 0);
    return +(c - this.comisionExpres).toFixed(2);
  }

  ngOnInit(): void {
    this.username = localStorage.getItem('nombreUsuario') || '';

    if (!this.username) {
      this.router.navigate(['/login']);
      return;
    }

    this.cargarSaldo();
    this.cargarConfiguracion();
  }

  cargarConfiguracion(): void {
    this.retirosService.getConfiguracion().subscribe(
      (cfg) => {
        this.expresHabilitado = !!cfg.expresHabilitado;
        // Si el admin desactivó exprés, forzamos el tipo a "normal".
        if (!this.expresHabilitado && this.retiroForm.get('tipo')?.value === 'expres') {
          this.retiroForm.patchValue({ tipo: 'normal' });
        }
      },
      (error) => { console.error('Error cargando configuración de retiros:', error); }
    );
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
        this.cargarSaldo();
        this.retiroForm.reset({ tipo: 'normal' });

        setTimeout(() => {
          this.router.navigate(['/mi-perfil']);
        }, 3000);
      },
      (error) => {
        this.loading = false;
        this.mensajeError = error.error?.error || 'Error al procesar la solicitud. Inténtalo de nuevo.';
        console.error('Error al solicitar retiro:', error);
      }
    );
  }

  volver(): void {
    this.location.back();
  }
}
