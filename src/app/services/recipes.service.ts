import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root',
})
export class RecipesService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);
  private baseUrl: string;
  constructor() {
    //this.baseUrl = 'http://localhost:3000/api/users';
    this.baseUrl = `${this.apiUrl}:444/api/recibos`;
  }

  register(formValue: any, image: any) {
    const formData = new FormData();
    formData.append('file', image); // 'file' debe coincidir con el nombre esperado en el servidor
    formData.append('username', formValue.username);
    formData.append('monto', formValue.monto);
    formData.append('banco', formValue.banco);
    return firstValueFrom(this.httpClient.post<any>(`${this.baseUrl}/register`, formData));
  }

  getImage(username: string) {
    console.log(`${this.baseUrl}/get-image/${username}`);
    const image = this.httpClient.get<any>(`${this.baseUrl}/get-image/${username}`);
    console.log(image);
    return image;
  }
  getImageUrl(id: string): string {
    // Construir y devolver la URL de la imagen del usuario
    return `${this.baseUrl}/get-image/${id}`;
  }

  getAll() {
    return this.httpClient.get<any>(`${this.baseUrl}/get-all-recipes`);
  }

  delete(id: string) {
    return this.httpClient.delete<any>(`${this.baseUrl}/delete/${id}`);
  }

  deleteAllAceptados() {
    return this.httpClient.delete<any>(`${this.baseUrl}/delete-all-aceptados`);
  }

  // Ejemplo de método para actualizar el estado
  async updateEstado(id: string, estado: string): Promise<any> {
    try {
      // Usamos firstValueFrom para convertir el Observable a Promise
      const response = await firstValueFrom(
        this.httpClient.put(`${this.baseUrl}/update-estado/${id}`, { estado })
      );
      
      // Verificamos que el backend respondió correctamente
      if (!response) {
        throw new Error('No se recibió respuesta del servidor');
      }
      
      return response;
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      throw error; // Re-lanzamos el error para manejarlo en el componente
    }
  }
}
