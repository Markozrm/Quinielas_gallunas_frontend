import { Injectable,inject } from '@angular/core';
import {HttpClient} from  '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);
  private baseUrl: string;
  constructor() {
    //this.baseUrl = 'http://localhost:3000/api/users';
    this.baseUrl = `${this.apiUrl}:444/api/users`;
  }

  register(formValue: any, image: any) {
    const formData = new FormData();
    formData.append('file', image);  // 'file' debe coincidir con el nombre esperado en el servidor
    formData.append('username', formValue.username);
    formData.append('password', formValue.password);
    formData.append('tipoUsuario', formValue.tipoUsuario);
    return firstValueFrom(this.httpClient.post<any>(`${this.baseUrl}/register`, formData));
  }

  login(formValue:any){
    console.log("logeando(service)");
    return firstValueFrom(
      this.httpClient.post<any>(`${this.baseUrl}/login`,formValue)
    )
  }

  getImage(username:string){
    console.log(`${this.baseUrl}/get-image/${username}`);
    const image = this.httpClient.get<any>(`${this.baseUrl}/get-image/${username}`);
    console.log(image);
    return image;
  }
  getImageUrl(username: string): string {
    // Construir y devolver la URL de la imagen del usuario
    return `${this.baseUrl}/get-image/${username}`;
  }
  getImageMsj(id: string): string {
    // Construir y devolver la URL de la imagen del usuario
    return `${this.apiUrl}:444/api/mensajes/get-image/${id}`;
  }
  setClaveStream(id:string,tituloStream:string,image:any,clave:string,esVIP:string): any {
    //console.log('Tamaño de la imagen antes de enviar la solicitud POST:', image.size, 'bytes');

    const formData = new FormData();
    formData.append('file', image);  // 'file' debe coincidir con el nombre esperado en el servidor
    formData.append('tituloStream', tituloStream);
    formData.append('clave',clave);
    formData.append('esVIP',esVIP);
    return firstValueFrom(
      this.httpClient.post<any>(`${this.apiUrl}:444/api/streams/setClave/${id}`,formData)
    );
  }
  getClaveStream(id:string): any {
    return this.httpClient.get<any>(`${this.apiUrl}:444/api/streams/getClave/${id}`);
  }
  getImagenStream(id:string): any {
    return `${this.apiUrl}:444/api/streams/getImagen/${id}`;
  }


  getUsers(){
    return this.httpClient.get<any>(`${this.baseUrl}/get-all-users`);
  }
  editUser(id: any, editedUser: any){
    return this.httpClient.put<any>(`${this.baseUrl}/edit-user/${id}`, editedUser);
  }
  banUser(username: any,){
    return this.httpClient.put<any>(`${this.baseUrl}/ban-user/${username}`,username);
  }
  desBanUser(username: any,){
    return this.httpClient.put<any>(`${this.baseUrl}/desban-user/${username}`,username);
  }
  editUserImage(id: any, editedUser: any,image:any){
    const formData = new FormData();
    formData.append('_id', editedUser._id);
    formData.append('file', image);  // 'file' debe coincidir con el nombre esperado en el servidor
    formData.append('username', editedUser.username);
    if (editedUser.newPassword){
      formData.append('newPassword', editedUser.newPassword);
    }
    
    return this.httpClient.put<any>(`${this.baseUrl}/edit-user-with-image/${id}`, formData);
  }  

  checkBanStatus(username: string) {
    return firstValueFrom(this.httpClient.get<any>(`${this.baseUrl}/check-ban/${username}`));
  }
  deleteUser(username: string) {
    return this.httpClient.delete<any>(`${this.baseUrl}/delete-user/${username}`);
  }

  updateSaldo(username: string, monto: number, concepto: string, tipo: string) {
    const body = { "monto":monto, "concepto": concepto, "tipo": tipo };  // El cuerpo de la petición contiene la cantidad a sumar
    return firstValueFrom(
      this.httpClient.put<any>(`${this.baseUrl}/add-saldo/${username}`, body)
    );
  }

  restarSaldo(username: string, monto: number, concepto: string) {
    const body = { "monto":monto, "concepto": concepto };  // El cuerpo de la petición contiene la cantidad a restar y el concepto
    return firstValueFrom(
      this.httpClient.put<any>(`${this.baseUrl}/subtract-saldo/${username}`, body)
    );
  }
  //Ruta para el historial de Usuarios
  getUserHistory(username: string) {
  return this.httpClient.get<any>(`${this.apiUrl}:444/api/apuestas/historialDetallado/${username}`);
}

  //Ruta para el historial agrupado por rondas
  getUserHistoryByRounds(username: string) {
    return this.httpClient.get<any>(`${this.apiUrl}:444/api/apuestas/historialPorRondas/${username}`);
  }

  getSaldo(username: string) {
    return this.httpClient.get<any>(`${this.baseUrl}/get-saldo/${username}`);
  }
  // Agregar este método a tu UsersService
uploadProfilePhoto(username: string, photo: File): Promise<any>{
  const formData = new FormData();
  formData.append('username', username);
  formData.append('file', photo); // 'file' debe coincidir con el nombre esperado en el servidor

  return firstValueFrom(
    this.httpClient.post<any>(`${this.baseUrl}/change-profile-photo/${username}`, formData)
  );
}

  // Obtener registros de saldos por usuario
  getUserSaldoRecords(username: string) {
    return this.httpClient.get<any>(`${this.apiUrl}:444/api/saldos/obtener-registros-por-usuario/${encodeURIComponent(username)}`);
  }

}
