import { FormControl, FormGroup } from '@angular/forms';
import { MenuComponent } from './../menu/menu.component';
import { Component } from '@angular/core';
import { Injectable,inject } from '@angular/core';
import {UsersService} from '../services/users.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {Router,ActivatedRoute} from '@angular/router'
import { filter } from 'rxjs/operators';
import { Event,NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone:true,
  imports:[MenuComponent,ReactiveFormsModule,FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  formulario : FormGroup;

  previousUrl: string = '';

  constructor(private route: ActivatedRoute,private router: Router,private location: Location){
    this.formulario = new FormGroup({
      username: new FormControl(),
      password: new FormControl()
    });

  }
  //router = inject(Router);
  userService = inject(UsersService);



  async onSubmit(){
    console.log("Inicio de sesion");
    const response = await this.userService.login(this.formulario.value);
    if (response.error){
    alert(response.error);
    }
    else{

        localStorage.setItem('tokenLogin',response.token)
        localStorage.setItem('nombreUsuario',response.token.username)
        localStorage.setItem('Rol',response.token.rol)
        // Guardar también el rol en minúsculas para compatibilidad
        if (response.token.rol) {
          localStorage.setItem('rol', response.token.rol.toLowerCase());
        }
        // Establecer avatar por defecto si no existe
        if (!localStorage.getItem('avatar')) {
          localStorage.setItem('avatar', 'assets/logoPrincipal.PNG')
        }
        // Establecer slogan por defecto si no existe
        if (!localStorage.getItem('slogan')) {
          localStorage.setItem('slogan', 'Usuario de Plumass')
        }
        console.log(response.token)
        if (!this.route.snapshot.paramMap.get('sala')){
           this.router.navigate([``]);
           return 
        }
        const userParam = this.route.snapshot.paramMap.get('sala');
        const portParam = this.route.snapshot.paramMap.get('port');
        // Navigate to the dynamic route based on the 'user' parameter
        if (response.token.rol == "invitado"){
          this.router.navigateByUrl(`live-inv/${userParam || 'Live'}/${portParam}`);
        }
        else if(this.esAdmin()){
          this.router.navigateByUrl(`live-admin/${userParam || 'Live'}/${portParam}`);
        }
        else{
          this.router.navigateByUrl(`live/${userParam || 'Live'}/${portParam}`);
        }
        
        console.log(userParam);
      }

    }
    esAdmin(): boolean {
      const rol = localStorage.getItem("Rol") || "";
  
      const esSuperAdmin = rol === 'superUsuario' || rol === 'administrador';
  
      return esSuperAdmin;
    }
    Volver(){
      this.location.back(); // Navegar a la última ruta visitada
    }
    Regitro(){
      const userParam = this.route.snapshot.paramMap.get('sala');
      const portParam = this.route.snapshot.paramMap.get('port');
      this.router.navigate([`RegistroInvitado/${userParam || 'Live'}/${portParam}`]);
    }

}

