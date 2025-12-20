import { FormControl, FormGroup } from '@angular/forms';
import { MenuComponent } from './../menu/menu.component';
import { Component, OnInit } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { UsersService } from '../services/users.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router'
import { filter } from 'rxjs/operators';
import { Event, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MenuComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  formulario: FormGroup;

  previousUrl: string = '';

  constructor(private route: ActivatedRoute, private router: Router, private location: Location) {
    this.formulario = new FormGroup({
      username: new FormControl(),
      password: new FormControl()
    });

  }
  //router = inject(Router);
  userService = inject(UsersService);

  ngOnInit(): void {
    const token = localStorage.getItem('tokenLogin');
    const rol = localStorage.getItem('Rol');
    if (token && rol) {
      // El usuario ya está logeado, redirigirlo
      this.redirectToConfiguredStream();
    }
  }

  async onSubmit() {
    console.log("Inicio de sesion");
    const response = await this.userService.login(this.formulario.value);
    if (response.error) {
      alert(response.error);
    }
    else {
      this.onLoginSuccess(response);
    }
  }

  async onLoginSuccess(responseLogin: any) {
    // ya tienes el token y rol en responseLogin
    localStorage.setItem('tokenLogin', responseLogin.token);
    localStorage.setItem('nombreUsuario', responseLogin.token.username);
    localStorage.setItem('Rol', responseLogin.token.rol);

    // redirigir al stream configurado (o a mi-perfil si no existe)
    await this.redirectToConfiguredStream();
  }

  private async redirectToConfiguredStream(): Promise<void> {
    const puerto = '443';
    // Intentar obtener siempre la clave más reciente desde el backend
    try {
      const res: any = await firstValueFrom(this.userService.getClaveStream('1'));
      const claveBackend = res?.stream?.clave;
      if (claveBackend) {
        localStorage.setItem('streamClave', claveBackend);
        console.log('Clave obtenida desde backend y guardada:', claveBackend);
        const rol = localStorage.getItem('Rol');
        const target = (rol === 'superUsuario' || rol === 'administrador')
          ? `/live-admin/${claveBackend}/${puerto}`
          : `/live-inv/${claveBackend}/${puerto}`;
        if (window.location.pathname !== target) {
          await this.router.navigateByUrl(target);
        }
        return;
      }
    } catch (error: any) {
      console.warn('Error obteniendo clave del backend en login:', error);
      // si falla la petición, seguir con fallback a localStorage
    }

    // Fallback: si backend no devuelve clave, usar la guardada en localStorage (si existe)
    const claveLocal = localStorage.getItem('streamClave');
    if (claveLocal) {
      const rol = localStorage.getItem('Rol');
      const target = (rol === 'superUsuario' || rol === 'administrador')
        ? `/live-admin/${claveLocal}/${puerto}`
        : `/live-inv/${claveLocal}/${puerto}`;
      if (window.location.pathname !== target) {
        await this.router.navigateByUrl(target);
      }
      return;
    }

    // Si no hay clave en ninguna parte, ir a mi-perfil
    await this.router.navigate(['/mi-perfil']);
  }

  esAdmin(): boolean {
    const rol = localStorage.getItem("Rol") || "";

    const esSuperAdmin = rol === 'superUsuario' || rol === 'administrador';

    return esSuperAdmin;
  }
  Volver() {
    this.location.back(); // Navegar a la última ruta visitada
  }
  Regitro() {
    const userParam = this.route.snapshot.paramMap.get('sala');
    const portParam = this.route.snapshot.paramMap.get('port');
    this.router.navigate([`RegistroInvitado/${userParam || 'Live'}/${portParam}`]);
  }

}

