import { NgIf } from '@angular/common';
import { MenuComponent } from '../menu/menu.component';
import { Component } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { UsersService } from '../services/users.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Validators, FormControl, FormGroup } from '@angular/forms';
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

export class RegisterInvitadoComponent {
  formulario: FormGroup;
  imagePreview: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router, private userService: UsersService, private location: Location) {
    const basicEmailValidator = Validators.pattern(/^[^@]+@[^@]+\.[^@]+$/);

    this.formulario = new FormGroup({
      username: new FormControl('', Validators.required),
      password: new FormControl('', Validators.required),
      image: new FormControl(),
      tipoUsuario: new FormControl('invitado', Validators.required), // ← valor inicial
      email: new FormControl('', [Validators.required, Validators.email]),
      nombre: new FormControl('', Validators.required),
      apellido: new FormControl('', Validators.required),
      telefono: new FormControl('', Validators.required),
      fechaNacimiento: new FormControl('', Validators.required),
    });
  }
  public image: any;

  handleImageChange(event: any): void {
    const input = event.target;
    const file = input.files[0];
    this.image = input.files[0];;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.imagePreview = null;
    }
  }

  async onSubmit() {
    this.formulario.get('tipoUsuario')?.patchValue("invitado");
    const email = this.formulario.get('email')?.value;

    // Validar que todos los campos estén llenos excepto la imagen y tipoUsuario
    const camposObligatorios = [
      'username',
      'password',
      'email',
      'nombre',
      'apellido',
      'telefono',
      'fechaNacimiento'
    ];
    for (const campo of camposObligatorios) {
      if (!this.formulario.get(campo)?.value) {
        alert('Por favor, completa todos los campos antes de continuar.');
        return;
      }
    }

    if (!email) {
      alert('Debes ingresar un correo electrónico');
      return;
    }
    const response = await this.userService.register(this.formulario.value, this.image);

    // Si el usuario ya existe, muestra el mensaje y no redirige
    if (response.data === "El nombre de usuario ya existe" || response.error) {
      alert('El nombre de usuario ya existe');
      return;
    }

    // Si el registro fue exitoso, redirige a la verificación de código
    console.log('Email para enviar código:', email);
    this.router.navigate(['/Login']);
  }

  volver() {
    this.location.back();
  }

}

