import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent {
  changePasswordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  currentUsername: string = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Obtener usuario al inicializar el componente
    this.currentUsername = localStorage.getItem('nombreUsuario') || '';
    
  }

  onSubmit(): void {
    if (!this.currentUsername) {
      this.errorMessage = 'Usuario no identificado';
      return;
    }

    if (this.changePasswordData.newPassword !== this.changePasswordData.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      username: this.currentUsername,
      currentPassword: this.changePasswordData.currentPassword,
      newPassword: this.changePasswordData.newPassword
    };

    this.http.put(`${environment.apiUrl_apuestas}:444/api/users/change-password`, payload)
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          this.successMessage = 'Contraseña cambiada exitosamente';
          setTimeout(() => {
            this.router.navigate(['/mi-perfil']); // Redirige al perfil después de cambiar
          }, 2000);
        },
        error: (error) => {
          this.isLoading = false;
          if (error.status === 401) {
            this.errorMessage = 'La contraseña actual es incorrecta';
          } else if (error.status === 404) {
            this.errorMessage = 'Usuario no encontrado';
          } else {
            this.errorMessage = 'Error al cambiar la contraseña. Intente nuevamente.';
          }
        }
      });
  }

  onCancel(): void {
    this.router.navigate(['/mi-perfil']); // Redirige al perfil al cancelar
  }
}