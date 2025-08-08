import { Component } from '@angular/core';
import { MenuComponent } from '../menu/menu.component';
import { CommonModule, NgIf } from '@angular/common';
import { UsersService } from '../services/users.service';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-iniciardor-streams',
  templateUrl: './iniciardor-streams.component.html',
  styleUrls: ['./iniciardor-streams.component.css'],
  standalone: true,
  imports: [MenuComponent, CommonModule, FormsModule, NgIf, ReactiveFormsModule],
})
export class IniciardorStreamsComponent {
  formulario: FormGroup;
  imagePreview: string | null = null;
  public claveStream = '';
  public urlStream = '';
  public image: any;
  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private router: Router,
  ) {
    this.formulario = this.fb.group({
      tituloStream: [''],
      image: [''],
      numeroStream: [''],
      esVIP: [false]
    });
  }

  handleImageChange(event: any): void {
    const input = event.target;
    const file = input.files[0];
    this.image = file;
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
    console.log("Inicio de sesión");

    const url = 'rtmp://209.38.136.151';
    const selectorValue = this.formulario.get('numeroStream')?.value;
    const fechaFormateada = this.formatDate(new Date());
    const tituloStream = this.formulario.get('tituloStream')?.value;
    const esVIP = this.formulario.get('esVIP')?.value;
    if (selectorValue) {
      const port = 1935 + Number(selectorValue) - 1;
      this.claveStream = `Stream${selectorValue}-${fechaFormateada}`;
      this.urlStream = `${url}:${port}/live`;
    
      const response = await this.usersService.setClaveStream(
        selectorValue.toString(),
        tituloStream,
        this.image,
        this.claveStream,
        esVIP.toString()
      );
      alert(response.data);
    }
  }

  private formatDate(date: Date): string {
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const año = date.getFullYear();
    return `${dia}-${mes}-${año}`;
  }

  Volver() {
    this.router.navigate(['/Admin']);
  }
}
