import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MenuComponent } from '../menu/menu.component';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-mi-perfil',
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MenuComponent]
})
export class MiPerfilComponent implements OnInit {
  saldoUsuario: string = '0.00$'; 
  nombreUsuario: string = '';
  userPhoto: string = '';
  balance: number = 0;
  mostrarCambioFoto : boolean = false;
  showChangePhoto: boolean = false;
  fotoSeleccionada: File | null = null;
  previewFoto: string | ArrayBuffer | null= null;
  usuario: any = {};
  mostrarEditarPerfil: boolean = false;
  // Formulario para cambio de contraseña
  cambioPasswordForm: FormGroup;
  mostrarCambioPassword: boolean = false;
    cambiarContrasena(): void {
    this.router.navigate(['/cambiar-contrasena']);
  }


  constructor(private router: Router, private usersService: UsersService) {
    this.cambioPasswordForm = new FormGroup({
      nuevaPassword: new FormControl('', [Validators.required, Validators.minLength(6)])
    });
  }

  esControladorBanca(): boolean {
  return localStorage.getItem('Rol') === 'controladorBanca';
}

toggleEditarPerfil() {
  this.mostrarEditarPerfil = !this.mostrarEditarPerfil;
}

irAdmin() {
  this.router.navigate(['/Admin']);
}

  editarPerfilForm: FormGroup = new FormGroup({
    nombre: new FormControl('', Validators.required),
    apellido: new FormControl('', Validators.required),
    telefono: new FormControl('', Validators.required),
    fechaNacimiento: new FormControl('', Validators.required)
  });

  ngOnInit(): void {
    // Obtener nombre de usuario del localStorage
    this.nombreUsuario = localStorage.getItem('nombreUsuario') || 'USUARIO';

    // Obtener la foto del usuario
    this.userPhoto = this.usersService.getImageUrl(this.nombreUsuario);

    // Obtener el saldo del usuario
    this.actualizarSaldo();

    // Obtener los datos completos del usuario SIN afectar la imagen
    this.usersService.getUsers().subscribe((users: any[]) => {
      this.usuario = users.find(u => u.username === this.nombreUsuario) || {};
      this.editarPerfilForm.patchValue({
        nombre: this.usuario.nombre || '',
        apellido: this.usuario.apellido || '',
        telefono: this.usuario.telefono || '',
        fechaNacimiento: this.usuario.fechaNacimiento || ''
      });
    });
  }

  actualizarSaldo(): void {
    this.usersService.getSaldo(this.nombreUsuario).subscribe((data: any) => {
      console.log("saldo: ", data);
      this.balance = data.saldo;
      this.saldoUsuario = this.balance.toLocaleString('es-MX') + '$';
    });
  }
  // Agregar estos métodos a la clase MiPerfilComponent
  toggleCambioFoto(): void {
    this.mostrarCambioFoto = !this.mostrarCambioFoto;
    if (!this.mostrarCambioFoto) {
      this.fotoSeleccionada = null;
      this.previewFoto = null;
    }
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.fotoSeleccionada = file;
      
      // Mostrar preview de la imagen
      const reader = new FileReader();
      reader.onload = () => {
        this.previewFoto = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async cambiarFoto(): Promise<void> {
    if (this.fotoSeleccionada && this.nombreUsuario) {
      try {
        const response = await this.usersService.uploadProfilePhoto(this.nombreUsuario, this.fotoSeleccionada);
        alert('Foto de perfil actualizada exitosamente');
        this.userPhoto = `${response.newPhotoUrl}?t=${new Date().getTime()}`;
        this.toggleCambioFoto();
      } catch (error) {
        alert('Error al actualizar la foto de perfil');
        console.error(error);
      }
    } else {
      alert('Por favor selecciona una foto válida');
    }
  }

  irARecargar(): void {
    this.router.navigate(['/recargar']);
  }

  retirarSaldo(): void {
    // Navegar a la página de retirar saldo
    this.router.navigate(['/retirar-saldo']);
  }

  verHistorialApuestas(): void {
    // Navegar a la página de historial de retiros
    this.router.navigate([`/historial-usuario/${this.nombreUsuario}`]);
  }

  verHistorialPeleas(): void {
    // Navegar a la página de historial de peleas
    this.router.navigate(['/Ver-apuestas']);
  }

  toggleCambioPassword(): void {
    this.mostrarCambioPassword = !this.mostrarCambioPassword;
  }

  cambiarPassword(): void {
    if (this.cambioPasswordForm.valid) {
      // Aquí implementaríamos la lógica para cambiar la contraseña
      alert('Contraseña actualizada exitosamente');
      this.mostrarCambioPassword = false;
    } else {
      alert('Por favor ingrese una contraseña válida (mínimo 6 caracteres)');
    }
  }
  //Método para la redirección al grupo de WA
  contactarWhatsApp(): void {
    window.open('https://chat.whatsapp.com/IJ95JG0WwxVJOGEHeCWZCu', '_blank');
  }
  volver(): void {
  const clave = 'Stream1-02-11-2025';
  const puerto = '443';
  this.router.navigate([`/live-admin/${clave}/${puerto}`]);
}
  logout(): void {
  // Eliminar todos los datos de apuestas del usuario
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(`apuestas_${this.nombreUsuario}`)) {
      localStorage.removeItem(key);
    }
  });
  localStorage.removeItem('Rol');
  localStorage.removeItem('tokenLogin');
  localStorage.removeItem('nombreUsuario');
  this.router.navigate(['/']);
}

guardarCambios(): void {
  if (this.editarPerfilForm.valid) {
    const datosActualizados = {
      ...this.usuario,
      ...this.editarPerfilForm.value
    };
    this.usersService.editUser(this.usuario._id, datosActualizados).subscribe((res: any) => {
      alert('Datos actualizados correctamente');
      // Actualiza los datos locales
      this.usuario = { ...this.usuario, ...this.editarPerfilForm.value };
    });
  } else {
    alert('Por favor, completa todos los campos correctamente.');
  }
}
}
