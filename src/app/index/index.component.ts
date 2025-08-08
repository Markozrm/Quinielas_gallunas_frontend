import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MenuComponent } from '../menu/menu.component';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms'; //
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-root',
  templateUrl: './index.html',
  styleUrls: ['./index.component.css'],
  standalone: true,
  imports: [MenuComponent]
})
export class IndexComponent implements OnInit {

  @ViewChild('backgroundVideo', { static: true }) private readonly videoElement: ElementRef<HTMLVideoElement> | any;
  @ViewChild('mobileVideo', { static: true }) private readonly mobileVideo: ElementRef<HTMLVideoElement> | any;
  titulo1: string = '';
  clave1: string = '';
  titulo2: string = '';
  clave2: string = '';
  titulo3 = ""
  public imagen1 = ''
  imagen2 = ''
  public imagen3 = ''
  clave3 = ''
  username = localStorage.getItem('nombreUsuario') || '';
  constructor(
    private userService: UsersService,
    private router: Router
  ) { }

  async ngOnInit(): Promise<void> {
    await this.fetchClaveStream('1', (resultado: any) => {
      this.titulo1 = resultado.stream.titulo;
      this.clave1 = resultado.stream.clave;
    });

    await this.fetchClaveStream('2', (resultado: any) => {
      this.titulo2 = resultado.stream.titulo;
      this.clave2 = resultado.stream.clave;
    });

    await this.userService.getClaveStream('3').subscribe(
      (resultado: any) => {
        console.log(resultado.stream.clave);
        this.titulo3 = resultado.stream.titulo;
        this.clave3 = resultado.stream.clave;

      },
      (error: any) => {
        console.error('Error al obtener la clave del stream:', error);
      }
    );

    this.imagen1 = this.userService.getImagenStream('1');
    this.imagen2 = this.userService.getImagenStream('2');
    this.imagen3 = this.userService.getImagenStream('3');
  }

  private async fetchClaveStream(id: string, callback: (resultado: any) => void): Promise<void> {
    this.userService.getClaveStream(id).subscribe(
      callback,
      (error: any) => {
        console.error(`Error al obtener la clave del stream ${id}:`, error);
      }
    );
  }

  ngAfterViewInit(): void {
     if (window.innerWidth > 768)
      {
    const video = this.videoElement.nativeElement;
    video.playsinline = true;
    video.muted = true;
    video.loop = true;
  }
    // Accede al elemento del video y llama al método play() para reproducir el video
    this.videoElement.nativeElement.playsinline = true;
    this.videoElement.nativeElement.muted = true; // Asegúrate de que el video esté silenciado
    this.videoElement.nativeElement.autoplay = true;
    this.videoElement.nativeElement.loop = true;
    this.videoElement.nativeElement.play().catch((error: any) => {
      console.error('Error al reproducir el video:', error);
    });
    this.mobileVideo.nativeElement.playsinline = true;  
    this.mobileVideo.nativeElement.muted = true;
    this.mobileVideo.nativeElement.autoplay = true;
    this.mobileVideo.nativeElement.loop = true;
    this.mobileVideo.nativeElement.play().catch((error: any) => {
      console.error('Error al reproducir el video:', error);
    }); 
  }
  irPanel() {
    this.router.navigate([`/Admin`]);
  }
  esAdmin(): boolean {
    const rol = localStorage.getItem("Rol") || "";

    const esSuperAdmin = rol === 'superUsuario' || rol === 'administrador';

    return esSuperAdmin;
  }
  async irStream1() {
    var claveStream = '';
    await this.userService.getClaveStream('1').subscribe(
      (resultado: any) => {
        if (this.esInvitado()) {
          console.log("esVIP",resultado.stream.esVIP);
          
          // Suscribirse al Observable del saldo para obtener el valor real
          this.userService.getSaldo(this.username).subscribe(
            (saldoObj: any) => {
              const saldo = saldoObj.saldo; // Acceder a la propiedad saldo del objeto
              if (resultado.stream.esVIP && (Number(saldo) < 1)) {
                alert("No tienes saldo suficiente para acceder a este stream");       
                this.router.navigate(['/mi-perfil']);    
              }
              else{
                this.router.navigate([`/live-inv/${resultado.stream.clave}/440`]);
              }
            },
            (error: any) => {
              console.error('Error al obtener el saldo:', error);
            }
          );
        }
        else if (this.esAdmin()) {
          this.router.navigate([`/live-admin/${resultado.stream.clave}/440`]);
        }
        else {
          this.router.navigate([`/live/${resultado.stream.clave}/440`]);
        }
      },
      (error: any) => {
        console.error('Error al obtener la clave del stream:', error);
      });
    console.log(`/live/${this.clave1}`)
  }
  async irStream2() {
    var claveStream = '';
    await this.userService.getClaveStream('2').subscribe(
      (resultado: any) => {
        if (this.esInvitado()) {
          console.log("esVIP",resultado.stream.esVIP);
          
          // Suscribirse al Observable del saldo para obtener el valor real
          this.userService.getSaldo(this.username).subscribe(
            (saldoObj: any) => {
              const saldo = saldoObj.saldo; // Acceder a la propiedad saldo del objeto
              
              if (resultado.stream.esVIP && (Number(saldo) < 1)) {
                alert("No tienes saldo suficiente para acceder a este stream");
                this.router.navigate(['/mi-perfil']);
              }
              else{
                console.log("Entrando en ELSE - Navegando al stream");
                this.router.navigate([`/live-inv/${resultado.stream.clave}/442`]);
              }
            },
            (error: any) => {
              console.error('Error al obtener el saldo:', error);
            }
          );
        }
        else if (this.esAdmin()) {
          this.router.navigate([`/live-admin/${resultado.stream.clave}/442`]);
        }
        else {
          this.router.navigate([`/live/${resultado.stream.clave}/442`]);
        }
      },
      (error: any) => {
        console.error('Error al obtener la clave del stream:', error);
      });
    console.log(`/live/${this.clave2}`)
  }
  async irStream3() {
    var claveStream = '';
    await this.userService.getClaveStream('3').subscribe(
      (resultado: any) => {
        if (this.esInvitado()) {
          console.log("esVIP",resultado.stream.esVIP);
          
          // Suscribirse al Observable del saldo para obtener el valor real
          this.userService.getSaldo(this.username).subscribe(
            (saldoObj: any) => {
              const saldo = saldoObj.saldo; // Acceder a la propiedad saldo del objeto
              
              if (resultado.stream.esVIP && (Number(saldo) < 1)) {
                alert("No tienes saldo suficiente para acceder a este stream");
                this.router.navigate(['/mi-perfil']);
              }
              else{
                console.log("Entrando en ELSE - Navegando al stream");
                this.router.navigate([`/live-inv/${resultado.stream.clave}/441`]);
              }
            },
            (error: any) => {
              console.error('Error al obtener el saldo:', error);
            }
          );
        }
        else if (this.esAdmin()) {
          this.router.navigate([`/live-admin/${resultado.stream.clave}/441`]);
        }
        else {
          this.router.navigate([`/live/${resultado.stream.clave}/441`]);
        }
      },
      (error: any) => {
        console.error('Error al obtener la clave del stream:', error);
      }
    );

    console.log(`/live/${this.clave3}`)
  }
  esInvitado(): boolean {
    const rol = localStorage.getItem("Rol") || "";
    
    const esInvitado = rol === 'invitado';
    
    return esInvitado;
  }
}