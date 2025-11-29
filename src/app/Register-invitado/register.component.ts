import { NgIf } from '@angular/common';
import { MenuComponent } from '../menu/menu.component';
import { Component, OnInit } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { UsersService } from '../services/users.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Validators, FormControl, FormGroup, AbstractControl, FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MenuComponent, NgIf, ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})

export class RegisterInvitadoComponent implements OnInit {
  formulario: FormGroup;
  imagePreview: string | null = null;
  public image: any;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UsersService,
    private location: Location
  ) {
    this.formulario = this.fb.group({
      username: ['', [
        Validators.required,
        this.noSpacesValidator,
        this.noAccentsValidator
      ]],
      password: ['', Validators.required],
      image: ['', [this.imageRequiredValidator]],
      tipoUsuario: ['invitado', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      nombre: ['', [
        Validators.required,
        this.noSpacesValidator,
        this.noAccentsValidator
      ]],
      apellido: ['', Validators.required],
      telefono: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // ...existing code...
  }

  // Validador personalizado para espacios
  noSpacesValidator(control: AbstractControl): { [key: string]: any } | null {
    const hasSpaces = /\s/.test(control.value);
    return hasSpaces ? { 'hasSpaces': true } : null;
  }

  // Validador personalizado para acentos
  noAccentsValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value) return null;
    const hasAccents = /[áéíóúÁÉÍÓÚñÑ]/.test(control.value);
    return hasAccents ? { 'hasAccents': true } : null;
  }

  // Validador personalizado para imagen
  imageRequiredValidator = (control: AbstractControl): { [key: string]: any } | null => {
    return !this.image ? { 'imageRequired': true } : null;
  };

  handleImageChange(event: any): void {
    const input = event.target;
    const file = input.files[0];
    this.image = input.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
      // Actualiza el validador de imagen
      this.formulario.get('image')?.updateValueAndValidity();
    } else {
      this.imagePreview = null;
      this.formulario.get('image')?.updateValueAndValidity();
    }
  }

  async onSubmit() {
    this.formulario.get('tipoUsuario')?.patchValue("invitado");
    const email = this.formulario.get('email')?.value;

    // Validar formulario completo
    if (this.formulario.invalid) {
      if (this.formulario.get('username')?.errors?.['required']) {
        alert('El nombre de usuario es obligatorio.');
        return;
      }
      if (this.formulario.get('username')?.errors?.['hasSpaces']) {
        alert('El nombre de usuario no puede contener espacios, acentos ni caracteres especiales.');
        return;
      }
      if (this.formulario.get('username')?.errors?.['hasAccents']) {
        alert('El nombre de usuario no puede contener acentos.');
        return;
      }
      if (this.formulario.get('nombre')?.errors?.['required']) {
        alert('El nombre es obligatorio.');
        return;
      }
      if (this.formulario.get('nombre')?.errors?.['hasSpaces']) {
        alert('El nombre no puede contener espacios.');
        return;
      }
      if (this.formulario.get('nombre')?.errors?.['hasAccents']) {
        alert('El nombre no puede contener acentos.');
        return;
      }
      if (this.formulario.get('image')?.errors?.['imageRequired']) {
        alert('Debes seleccionar una imagen de perfil.');
        return;
      }
      if (this.formulario.get('email')?.errors?.['required']) {
        alert('El correo electrónico es obligatorio.');
        return;
      }
      if (this.formulario.get('email')?.errors?.['email']) {
        alert('El correo electrónico no es válido.');
        return;
      }
      // Puedes agregar más validaciones específicas aquí...
      alert('Por favor, completa todos los campos correctamente antes de continuar.');
      return;
    }

    const response = await this.userService.register(this.formulario.value, this.image);

    if (response.data === "El nombre de usuario ya existe" || response.error) {
      alert('El nombre de usuario ya existe');
      return;
    }

    // Redirige al perfil después del registro exitoso
    this.router.navigate(['/mi-perfil']);
  }

  volver() {
    this.location.back();
  }
}

