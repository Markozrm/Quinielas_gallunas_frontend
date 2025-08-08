import { MenuComponent } from '../../app/menu/menu.component';
import { Component, OnInit ,OnDestroy} from '@angular/core';
import { UntypedFormControl, UntypedFormGroup,ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { apuestaService } from 'src/app/services/apuestas.service';
import { UsersChatComponent } from '../../app/chat/components/users-chat/users-chat.component';
import { UsersRoomsComponent } from '../../app/chat/components/users-rooms/users-rooms.component';
import { VideoPlayerComponent } from 'src/app/reproductor/reproductor.component';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { UsersService } from 'src/app/services/users.service';
import { CommonModule } from '@angular/common';
import { Subscription,of,Observable } from 'rxjs';
import { SharedService } from 'src/app/services/shared.service';
import { take } from 'rxjs/operators';


@Component({
    selector: 'app-apuestas-stream',
    templateUrl: './apuestas-stream.component.html',
    styleUrls: ['./apuestas-stream.component.css'],
    standalone: true,
    imports: [UsersRoomsComponent,CommonModule,ReactiveFormsModule,
      UsersChatComponent,VideoPlayerComponent,MenuComponent],
})
export class ApuestasStreamComponent implements OnInit,OnDestroy{
  
  public textButton = 'Cerrar Apuestas';
  public chat$ = this.apuestaService.chat$;
  public todasLasApuestas: any[] = []; // Array para almacenar todas las apuestas
  selectedTeam: 'rojo' | 'verde' | null = null;
  apuesta: { rojo: string; verde: string } = { rojo: '', verde: '' };
  public scrollable: boolean = true;
  public numeroPelea: number = 0;
  public ganadorPublicado:string= '';
  public streamActual: string = ''; // Guardar la sala/stream actual
  private intervaloActualizacion: any; // Intervalo para actualización automática
  public totalStream: number = 0;
  public totalRondaActual: number = 0;
  public resumenRondas: any[] = [];
    public columnasTabla = [
    { nombre: 'Pelea', propiedad: 'ronda' },
    { nombre: 'Monto cazado', propiedad: 'cazado' }
  ];

  
  constructor(private usersService: UsersService,
    private route: ActivatedRoute,private router: Router,
    private apuestaService: apuestaService,
    private sharedService: SharedService
  ) {}
  private apuestaSubscription: Subscription | undefined;
  private booleanStateSubscription: Subscription | undefined;
  public formFiltro = new UntypedFormGroup({
    message: new UntypedFormControl('')
  });
  

  filtrar(){
    const { message } = this.formFiltro.value;
    if (message) {
      this.streamActual = message;
       //Muestra el resumen de las apuestas 
      this.obtenerResumenStream(message);
      // Primero obtenemos todas las apuestas de todas las rondas
      this.obtenerResumenStream(message);
      this.obtenerTodasLasApuestas(message);
      // Mantenemos la conexión de socket para otras funcionalidades
      this.apuestaService.leaveRoom();
      this.apuestaService.initChat();
      const username:string= localStorage.getItem("nombreUsuario") || "";
      this.apuestaService.joinRoom(message, username);
    }
  }
    //Nuevo método para obtener el resumen 
  obtenerResumenStream(sala: string) {
    this.apuestaService.obtenerResumenStream(sala).subscribe({
      next: (res: any) => {
        this.totalStream = res.totalStream ||0;
        this.resumenRondas = res.detalles || [];
      },
      error: (err) => {console.error('Error:', err);
      this.totalStream = 0;
      this.resumenRondas = [];}
    });
  }

  ngOnInit(): void {

    this.apuestaSubscription = this.apuestaService.getEstadoApuesta().subscribe((data: any) => {
      this.numeroPelea = data.rondaActual;
      console.log("estado: ",data);
      if (data.estadoApuesta){
        this.textButton = 'Cerrar Apuestas';
      }
      else {
        console.log("ultimo ganador: ",data.ganador);
        if (data.ganador != ''){
          this.textButton = 'Abrir Apuestas';
        }
        else{
          this.textButton = 'Escoger Ganador';
        }
        
      }
       // Añade esta línea crítica - Actualiza la tabla cuando cambia el estado
  if (this.streamActual) {
    this.obtenerResumenStream(this.streamActual);
  }
    });
    this.route.params.subscribe( params=> {
      const variableValue = params['sala'];
      if (variableValue) {
        this.streamActual = variableValue;
        // Obtenemos todas las apuestas para esta sala
        this.obtenerResumenStream(variableValue);
        
        // Mantenemos la conexión de socket para otras funcionalidades
        this.apuestaService.leaveRoom();
        this.apuestaService.initChat();
        console.log(variableValue);
        const username:string= localStorage.getItem("nombreUsuario") || "";
        this.apuestaService.joinRoom(variableValue, username);
      }
    });
    this.apuestaSubscription = this.apuestaService.chat$.subscribe(messages => {
        console.log("apuestas: ",this.chat$);
    });
    this.apuestaSubscription = this.apuestaService.users$.subscribe(users => {
      this.users = users;
      console.log('Usuarios actualizados:', this.users);
    });
    this.apuestaSubscription = this.apuestaService.getUsersCount().subscribe((count: any) => {
      // Lógica que quieres ejecutar cuando chat$ se actualiza
      this.connectedUsers = count;
    });
    this.apuestaService.estadoApuesta.subscribe((valor) => {
      console.log('Estado actual:', valor);
      this.textButton = valor ? 'Abrir Apuestas' : 'Cerrar Apuestas';
    });
  
  }
  ngOnDestroy() {
    this.apuestaSubscription?.unsubscribe();
    this.booleanStateSubscription?.unsubscribe();
  
    // Limpiar el intervalo de actualización al destruir el componente
    if (this.intervaloActualizacion) {
      clearInterval(this.intervaloActualizacion);
    }
  }

  // Método para actualizar las apuestas cuando cambia alguna
  actualizarApuestas() {
    if (this.streamActual) {
      this.obtenerResumenStream(this.streamActual);
    }
  }
  obtenerTodasLasApuestas(sala: string) {
    this.apuestaService.obtenerTodasApuestasAgrupadas(sala).subscribe({
      next: (data: any) => {
        if (data && Object.keys(data).length > 0) {
          // Convertimos los datos a un array si no lo es yaAdd commentMore actions
          this.todasLasApuestas = Array.isArray(data) ? data : Object.values(data);
          
          // Ordenamos las apuestas por ronda (descendente) y luego por fecha
          this.todasLasApuestas.sort((a, b) => {
            // Primero ordenar por ronda de forma descendente (las más recientes primero)
            if (b.ronda !== a.ronda) {
              return b.ronda - a.ronda;
            }
            // Si son de la misma ronda, ordenar por fecha
            const fechaA = new Date(a.fecha).getTime();
            const fechaB = new Date(b.fecha).getTime();
            return fechaB - fechaA;
          });
          
          console.log('Todas las apuestas:', this.todasLasApuestas);
        } else {
          this.todasLasApuestas = [];
          console.log('No se encontraron apuestas para esta sala');
        }
      },
      error: (error) => {
        console.error('Error al obtener apuestas:', error);
        this.todasLasApuestas = [];
      }
    });
  }

  public connectedUsers:any;
  isSidebarOpen = false;
  username: string = localStorage.getItem('nombreUsuario') ?? '';
  userPhoto: string = this.getImage(this.username);
  isPopupOpen = false; // Estado para el pop-up
  users: UserType[] = [];
  public getImage(username: string): any {

    return this.usersService.getImageUrl(username);
  }

  userService = inject(UsersService);
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
    // Puedes agregar lógica para cerrar la sesión aquí si es necesario
  }
  logout() {
    // Lógica para cerrar sesión, por ejemplo, limpiar tokens y redirigir a la página de inicio de sesión.
    // Aquí también puedes agregar la lógica para limpiar cualquier otro dato que necesites.
    localStorage.removeItem('tokenLogin');
    localStorage.removeItem('nombreUsuario');
    const userParam = this.route.snapshot.paramMap.get('sala');
    // Navigate to the dynamic route based on the 'user' parameter

    this.router.navigate([`/`]);
    // Otra lógica de cierre de sesión que puedas necesitar...
  }
  inicio(){
    this.router.navigate([`/`]);
  }
  esAdmin(): boolean {
    const rol = localStorage.getItem("Rol") || "";

    const esSuperAdmin = rol === 'superUsuario' || rol === 'administrador';

    return esSuperAdmin;
  }
  esInvitado():boolean{
    const rol = localStorage.getItem("Rol") || "";
    //console.log("rol: ",rol);
    const esInvitado = rol === 'invitado';
    //console.log(esInvitado);
    return esInvitado;
  }

    // Métodos para manejar el pop-up
    openPopup() {
      if (this.esAdmin()){
        this.isPopupOpen = true;
      }
      
    }
    irRecargar() {
      this.router.navigate(['/recargar']);
    }
  
    closePopup() {
      this.isPopupOpen = false;
    }
  
    getUserPhoto(username: string): string {
      return this.usersService.getImageUrl(username);
    }

    esVerde(verde:any){
      if (verde != ""){
        return true;
      }
      else{
        return false;
      }
    }

}
interface UserType {
  name: string;
  avatar: string;
  slogan: string;
  id: string;
}