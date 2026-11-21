
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import HLS from 'hls.js';
import { environment } from 'src/environments/environment';
import { StreamAuthService } from '../services/stream-auth.service';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.css']
})
export class VideoPlayerComponent implements OnInit {
  private apiUrl_live: string = environment.apiUrl_live;
  private apiUrl_live_2: string = environment.apiUrl_live_2;
  private apiUrl_live_3: string = environment.apiUrl_live_3;
  private hls: HLS | null = null;
  private currentSign: string = '';
  public user: string | null = 'HOME' //TODO: User que se pasa por la url como parametro !
  public port: string | null = '443'
  private playing: boolean = false;
  @ViewChild('video', { static: true }) private readonly video: ElementRef<HTMLVideoElement> | any;

  constructor(private route: ActivatedRoute, private streamAuth: StreamAuthService) {
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

      // Suscribirse a cambios en los parámetros de la URL
      this.route.paramMap.subscribe(async params => {
        this.user = params.get('sala') || 'HOME';
        this.port = params.get('port') || '443';

        // Pedir el sign al server login. Si STREAM_SECRET no esta
        // configurado en el server, devuelve string vacio y la URL queda
        // sin query (compatible hacia atras).
        const sala = this.user;
        const sign = await this.streamAuth.getSign(sala);
        this.currentSign = sign;

        let baseUrl = this.apiUrl_live;
        if (this.port == '442') baseUrl = this.apiUrl_live_2;
        else if (this.port != '443') baseUrl = this.apiUrl_live_3;

        const url = this.streamAuth.buildHlsUrl(baseUrl, sala, sign);
        this.load(url);
        console.log("Cargando stream para:", this.user, "Puerto:", this.port);
      });

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

  public loadInit(): void {
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
    // Destruir instancia previa si existe (evita fugas al cambiar de sala)
    if (this.hls) {
      try { this.hls.destroy(); } catch (e) { /* noop */ }
    }

    // HLS.js por defecto NO propaga la query string del .m3u8 a los .ts,
    // asi que si Traefik exige ?sign= en cada request, los segmentos
    // fallan con 401 y el video queda en negro. xhrSetup intercepta cada
    // peticion y agrega el sign vigente. Usa la URL ya reescrita de xhr
    // (no la original) para que HLS.js reciba la respuesta correcta.
    const sign = this.currentSign;
    this.hls = new HLS({
      xhrSetup: (xhr: XMLHttpRequest, url: string) => {
        if (sign && !/[?&]sign=/.test(url)) {
          const sep = url.includes('?') ? '&' : '?';
          const finalUrl = `${url}${sep}sign=${encodeURIComponent(sign)}`;
          xhr.open('GET', finalUrl, true);
        }
      }
    });

    this.hls.loadSource(currentVideo);
    this.hls.attachMedia(this.video.nativeElement);
    this.video.nativeElement.addEventListener('loadedmetadata', () => {
      // Saltar al segmento mas reciente (live edge)
      this.video.nativeElement.currentTime = this.video.nativeElement.duration;
    });

  }

};