import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  
  private apiUrl = environment.apiUrl;
  private baseUrl = `${this.apiUrl}:444/api/videos`;
  constructor(private http: HttpClient) { }

  getVideos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/todos`);
  }

  getVideoUrl(folder: string, name: string): any {
    return this.http.get(`${this.baseUrl}/${folder}/${name}`);
  }

  deleteVideo(folder: string, name: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${folder}/${name}`);
  }
}