import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class Pm2Service {

  private apiUrl = environment.apiUrl;
  private baseUrl: string;
// Cambia esto por la URL de tu API

  constructor(private http: HttpClient) {

     this.baseUrl = `${this.apiUrl}:444/api/scripts/restart`; 
   }


  restartProcess(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}`, {});
  }
}
