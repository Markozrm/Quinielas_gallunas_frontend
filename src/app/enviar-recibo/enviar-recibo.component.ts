import { Component,OnInit } from '@angular/core';
import { CommonModule,NgIf } from '@angular/common';
import { MenuComponent } from '../menu/menu.component';
import { RecipesService } from '../services/recipes.service';
import { FormControl, FormGroup,FormBuilder } from '@angular/forms';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
@Component({
  selector: 'app-enviar-recibo',
  templateUrl: './enviar-recibo.component.html',
  styleUrls: ['./enviar-recibo.component.css'],
  standalone: true,
  imports: [ MenuComponent,CommonModule,FormsModule,NgIf,ReactiveFormsModule ]
})
export class EnviarReciboComponent implements OnInit{
  formulario : FormGroup;
  imagePreview: string | null = null;
  public claveStream = '';
  public urlStream = '';
  private maxRecibos = 3;
  
  constructor(
    private fb: FormBuilder,
    private recipesService: RecipesService,
    private router: Router,
    private location: Location
  ){
    this.formulario = new FormGroup({
      username: new FormControl(this.username),
      monto: new FormControl(),
      banco: new FormControl(), // <-- Agregado aquí
      image: new FormControl(),
    });
  }

  ngOnInit(): void {
    // Solicitar permisos para notificaciones
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
  public image:any;
  private username = localStorage.getItem("nombreUsuario") || '';
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
    if (!this.formulario.value.banco) {
      alert('Debes seleccionar un banco');
      return;
    }
    try {
      // Obtener todos los recibos
      const todosRecibos = await this.recipesService.getAll().toPromise();
      const ahora = new Date();

      // Filtrar recibos del usuario en las últimas 2 horas
      const recibosDelUsuario = todosRecibos.filter((recibo: any) => {
        if (recibo.username !== this.username) return false;
        if (!recibo.fecha) return false;
        const fechaRecibo = new Date(recibo.fecha);
        const diferenciaHoras = (ahora.getTime() - fechaRecibo.getTime()) / (1000 * 60 * 60);
        return diferenciaHoras <= 2;
      });

      // SIEMPRE bloquear si supera el límite, sin importar notificaciones
      if (recibosDelUsuario.length >= this.maxRecibos) {
        // Mostrar notificación si es posible, si no, alert
        if (Notification.permission === 'granted') {
          new Notification('Límite de recibos alcanzado', {
            body: 'Por el momento ya no puedes mandar más recibos',
            icon: 'assets/logoPrincipal.PNG'
          });
        }
        alert('Por el momento ya no puedes mandar más recibos');
        return;
      }

      // Si no ha alcanzado el límite, enviar el recibo
      const response = await this.recipesService.register(this.formulario.value, this.image);
      alert("Recibo enviado");

    } catch (error) {
      console.error('Error al verificar o enviar recibo:', error);
      alert("Ocurrió un error al enviar el recibo. Intenta de nuevo.");
    }
  }
  Volver(){
    this.location.back(); // Navegar a la última ruta visitada
  }

}
