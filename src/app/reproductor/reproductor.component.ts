
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
      // Configuración específica para iOS
      this.video.nativeElement.playsinline = true;
      this.video.nativeElement.muted = true;
      this.video.nativeElement.autoplay = true;
      
      // Prevenir comportamiento de pantalla completa en iOS
      this.video.nativeElement.setAttribute('webkit-playsinline', 'true');
      this.video.nativeElement.setAttribute('x5-video-player-type', 'h5');
      this.video.nativeElement.setAttribute('x5-video-player-fullscreen', 'false');
      
      this.user = this.route.snapshot.paramMap.get('sala') || 'HOME';
      this.port = this.route.snapshot.paramMap.get('port') || '443';
      this.load(`${this.apiUrl}:${this.port}/live/${this.user}/index.m3u8`);
      console.log("Despues de cargar",this.user);
      console.log("Despues de cargar",this.port);
    } catch (error) {
      console.error('Error loading video:', error);
    }
  }
  ngAfterViewInit(): void {
    // Configuración adicional para iOS después de que la vista se inicialice
    this.setupVideoForIOS();
    
    // Agregar eventos para manejar el comportamiento de pantalla completa
    this.addVideoEventListeners();
    
    this.video.nativeElement.play().catch((error: any) => {
      console.error('Error al reproducir el video:', error);
    });
  }

  private setupVideoForIOS(): void {
    const videoElement = this.video.nativeElement;
    
    // Configuración específica para iOS
    videoElement.playsinline = true;
    videoElement.muted = true;
    videoElement.autoplay = true;
    
    // Atributos adicionales para prevenir pantalla completa
    videoElement.setAttribute('webkit-playsinline', 'true');
    videoElement.setAttribute('x5-video-player-type', 'h5');
    videoElement.setAttribute('x5-video-player-fullscreen', 'false');
  }

  private addVideoEventListeners(): void {
    const videoElement = this.video.nativeElement;
    
    // Manejar cuando el video entra en pantalla completa
    videoElement.addEventListener('webkitbeginfullscreen', () => {
      console.log('Video entró en pantalla completa');
    });
    
    // Manejar cuando el video sale de pantalla completa
    videoElement.addEventListener('webkitendfullscreen', () => {
      console.log('Video salió de pantalla completa');
      // Intentar reanudar la reproducción automáticamente
      setTimeout(() => {
        if (videoElement.paused) {
          videoElement.play().catch((error: any) => {
            console.warn('No se pudo reanudar automáticamente:', error);
            // Mostrar control de play manual si es necesario
          });
        }
      }, 100);
    });
    
    // Eventos estándar de pantalla completa
    videoElement.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && videoElement.paused) {
        setTimeout(() => {
          videoElement.play().catch((error: any) => {
            console.warn('No se pudo reanudar después de salir de pantalla completa:', error);
          });
        }, 100);
      }
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