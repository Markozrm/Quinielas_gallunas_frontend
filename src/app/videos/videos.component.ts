import { Component, OnInit } from '@angular/core';
import { VideoService } from '../services/videos.service';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-video-list',
  templateUrl: './videos.component.html',
  styleUrls: ['./videos.component.css'],
  standalone: true,
  imports: [NgFor, NgIf]
})
export class VideoListComponent implements OnInit {
  videos: any[] = [];
  selectedVideoUrl: string | null = null;

  constructor(private videoService: VideoService,private router: Router,private http: HttpClient) { }

  ngOnInit(): void {
    this.loadVideos();
  }

  loadVideos(): void {
    this.videoService.getVideos().subscribe(data => {
      this.videos = data;
    });
  }

  viewVideo(folder: string, name: string): void {
  
      this.router.navigate(['/video', folder, name]);


  }


  deleteVideo(folder: string, name: string): void {
    this.videoService.deleteVideo(folder, name).subscribe(data => {
      alert(`Video borrado: ${data.message}`);
      this.loadVideos(); // Recargar la lista de videos después de eliminar uno
    });
  }
}