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
      tipoUsuario: new FormControl(),
      email: new FormControl('', [Validators.required, Validators.email]), // <-- Validación
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
    if (!email) {
      alert('Debes ingresar un correo electrónico');
      return;
    }
    const response = await this.userService.register(this.formulario.value, this.image);

    if (response.error) {
      alert(response.error);
    } else {
      console.log('Email para enviar código:', email);
      this.router.navigate(['/codigo-ingreso', email]);
    }
  }
  volver() {
    this.location.back();
  }
}

