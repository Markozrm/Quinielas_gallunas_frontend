import { Component, OnInit ,ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import HLS from 'hls.js';
@Component({
  selector: 'app-video-player',
  templateUrl: './video-stream.component.html',
  styleUrls: ['./video-stream.component.css']
})
export class VideoStreamComponent implements OnInit {
  
  videoUrl: string = 'https://cheapserverhub.com:444/api/videos';
  private hls = new HLS();
  @ViewChild('video', { static: true }) private readonly video: ElementRef<HTMLVideoElement> | any;

  constructor(private route: ActivatedRoute) {}

  public ngOnInit() {
    try {
      const folder = this.route.snapshot.paramMap.get('folder');
      const name = this.route.snapshot.paramMap.get('name');
      this.videoUrl = `${this.videoUrl}/${folder}/${name}`
      console.log(this.videoUrl);
      this.load(this.videoUrl);
      //this.video.nativeElement.play();
    } catch (error) {
      console.error('Error loading video:', error);
    }
  }
  

  public loadInit(): void{
    console.log('El componente se ha inicializado');
  }

  public load(currentVideo: string): void {

    if (HLS.isSupported()) {
      //this.video.nativeElement.muted = true;
      this.loadVideoWithHLS(currentVideo);
    } else {
      this.video.nativeElement.src = currentVideo;
      //this.video.nativeElement.muted = true;
      this.video.nativeElement.setAttribute('playsinline', 'true');
      
      // this.video.nativeElement.addEventListener('loadedmetadata', () => {
      //   // Aquí puedes buscar el segmento más reciente y establecer el tiempo actual del video
      //   this.video.nativeElement.currentTime = this.video.nativeElement.duration;
        
      //   // Iniciar la reproducción después de configurar el tiempo actual
      //   this.video.nativeElement.play();
      // });
    }

  }

  private async loadVideoWithHLS(currentVideo: string) {
    this.hls.loadSource(currentVideo);
    this.hls.attachMedia(this.video.nativeElement);
    this.video.nativeElement.addEventListener('loadedmetadata', () => {
      // Aquí puedes buscar el segmento más reciente y establecer el tiempo actual del video
      this.video.nativeElement.currentTime = this.video.nativeElement.duration;
      
      // Iniciar la reproducción después de configurar el tiempo actual
      //this.video.nativeElement.play();
    });
  
  }

};