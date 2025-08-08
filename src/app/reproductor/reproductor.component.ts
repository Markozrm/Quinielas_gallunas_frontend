
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import HLS from 'hls.js';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.css']
})
export class VideoPlayerComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  private hls = new HLS();
  public user: string | null = 'HOME' //TODO: User que se pasa por la url como parametro !
  public port: string | null = '443'
  private playing: boolean = false;
  @ViewChild('video', { static: true }) private readonly video: ElementRef<HTMLVideoElement> | any;

  constructor(private route: ActivatedRoute) {
  }

  public ngOnInit() {
    try {
      this.video.nativeElement.playsinline = true;
      this.video.nativeElement.muted = true; // Asegúrate de que el video esté silenciado
      this.video.nativeElement.autoplay = true;
      this.user = this.route.snapshot.paramMap.get('sala') || 'HOME';
      this.port = this.route.snapshot.paramMap.get('port') || '443';
      this.load(`${this.apiUrl}:${this.port}/live/${this.user}/index.m3u8`);
      console.log("Despues de cargar",this.user);
      console.log("Despues de cargar",this.port);
      //this.video.nativeElement.play();
    } catch (error) {
      console.error('Error loading video:', error);
    }
  }
  ngAfterViewInit(): void {
    // Accede al elemento del video y llama al método play() para reproducir el video
    this.video.nativeElement.playsinline = true;
    this.video.nativeElement.muted = true; // Asegúrate de que el video esté silenciado
    this.video.nativeElement.autoplay = true;
    this.user = this.route.snapshot.paramMap.get('sala') || 'HOME';
    this.port = this.route.snapshot.paramMap.get('port') || '443';
    this.load(`${this.apiUrl}:${this.port}/live/${this.user}/index.m3u8`);
    this.video.nativeElement.play().catch((error: any) => {
      console.error('Error al reproducir el video:', error);
    });
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