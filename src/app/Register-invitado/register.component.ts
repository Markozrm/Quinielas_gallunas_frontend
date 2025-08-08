import { NgIf } from '@angular/common';
import { MenuComponent } from '../menu/menu.component';
import { Component } from '@angular/core';
import { Injectable,inject } from '@angular/core';
import {UsersService} from '../services/users.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormControl, FormGroup } from '@angular/forms';
import {Router, ActivatedRoute} from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone:true,
  imports:[MenuComponent,NgIf,ReactiveFormsModule,FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})

export class RegisterInvitadoComponent {
  formulario: FormGroup;
  imagePreview: string | null = null;

  constructor(private route: ActivatedRoute,private router: Router, private userService: UsersService,private location: Location) {
    this.formulario = new FormGroup({
      username: new FormControl(),
      password: new FormControl(),
      image: new FormControl(),
      tipoUsuario: new FormControl(),
    });
  }
  public image:any;

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
    console.log(this.image);

    // Convierte la imagen a base64 antes de enviar el formulario
    // if (this.imagePreview) {
    //   // const base64Image = this.imagePreview.split(',')[1]; // Elimina el encabezado de la URL base64
    //   // this.formulario.controls['image'].setValue(base64Image);
    //   console.log(this.formulario.value);
    // }
    //const selectorValue = this.formulario.get('tipoUsuario')?.value;

    this.formulario.get('tipoUsuario')?.patchValue("invitado");

    console.log(this.formulario.value)
    const response = await this.userService.register(this.formulario.value,this.image);
    if (response.error){
      alert(response.error);
      }
    else{
    console.log(response);
    const responseLogin = await this.userService.login(this.formulario.value);
    if (responseLogin.error){
      alert(responseLogin.error);
      }
    else{
          localStorage.setItem('tokenLogin',responseLogin.token)
          localStorage.setItem('nombreUsuario',responseLogin.token.username)
          localStorage.setItem('Rol',responseLogin.token.rol)
          // Establecer avatar por defecto si no existe
          if (!localStorage.getItem('avatar')) {
            localStorage.setItem('avatar', 'assets/logoPrincipal.PNG')
          }
          // Establecer slogan por defecto si no existe
          if (!localStorage.getItem('slogan')) {
            localStorage.setItem('slogan', 'Usuario de Plumass')
          }
          console.log(responseLogin.token)
          if (!this.route.snapshot.paramMap.get('sala')){
             this.router.navigate([``]);
             return 
          }
          const userParam = this.route.snapshot.paramMap.get('sala');
          const portParam = this.route.snapshot.paramMap.get('port');
          // Navigate to the dynamic route based on the 'user' parameter
          if (responseLogin.token.rol == "invitado"){
            this.router.navigateByUrl(`live-inv/${userParam || 'Live'}/${portParam}`);
          }

          else{
            this.router.navigateByUrl(`live/${userParam || 'Live'}/${portParam}`);
          }
          
          console.log(userParam);
        }
  
      
      }
    }
  volver(){
    this.location.back();
  }
}

