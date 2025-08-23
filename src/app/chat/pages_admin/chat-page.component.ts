import { MenuComponent } from '../../menu/menu.component';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { apuestaService } from 'src/app/services/apuestas.service';
import { ChatService } from '../services/chat.service';
import { UsersChatComponent } from '../components/users-chat/users-chat.component';
import { UsersRoomsComponent } from '../components/users-rooms/users-rooms.component';
import { VideoPlayerComponent } from 'src/app/reproductor/reproductor.component';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { UsersService } from 'src/app/services/users.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SharedService } from 'src/app/services/shared.service';
import { take } from 'rxjs/operators';
import { UsersTypeComponent } from '../components/users-type/users-type.component';
import { OpenBetModalComponent } from '../components/open-bet-modal/open-bet-modal.component';
import { CloseBetModalComponent } from '../components/close-bet-modal/close-bet-modal.component';
import { ChooseWinnerModalComponent } from '../components/choose-winner/choose-winner-modal.component';
import { ChatModalComponent } from '../components/chat-modal/chat-modal.component';

@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.css'],
  standalone: true,
  imports: [UsersRoomsComponent, CommonModule, ChooseWinnerModalComponent,
    UsersChatComponent, UsersTypeComponent, OpenBetModalComponent,
    CloseBetModalComponent, VideoPlayerComponent, MenuComponent, ChatModalComponent],
})
export class ChatAdminPageComponent implements OnInit, OnDestroy {

  public textButton = 'Cerrar Apuestas';
  public chat$ = this.apuestaService.chat$;
  selectedTeam: 'rojo' | 'verde' | 'empate' | null = null;
  apuesta: { rojo: string; verde: string; empate: string } = { rojo: '', verde: '', empate: '' };
  public scrollable: boolean = true;
  public numeroPelea: number = 0;
  public ganadorPublicado: string = '';
  public estadoApuesta: boolean = false;
  public rondaAnterior: number = 0;
  public rondaActualCerrada: number = 0; // Nueva propiedad para guardar la ronda que se acaba de cerrar
  public salaActual: string = '';
  public portActual: string = '';
  public ultimaRondaValida: number = 0;
  
  // Nuevas propiedades para manejo de rondas en espera
  public rondasEnEspera: number[] = [];
  public rondaSeleccionada: number = 0;
  
  public cantidadApostadaRojo: number = 0;
  public cantidadApostadaVerde: number = 0;
  public redTeamName: string = '';
  public greenTeamName: string = '';
  public redPoints: number = 0;
  public greenPoints: number = 0;

  constructor(private usersService: UsersService,
    private route: ActivatedRoute, private router: Router,
    private apuestaService: apuestaService,
    private chatService: ChatService,
    private sharedService: SharedService
  ) {
    this.route.params.subscribe(params => {
      this.salaActual = params['sala'];
      this.portActual = params['port'];
      const isInvitado = localStorage.getItem('Rol') === 'invitado';
      if(isInvitado){
        this.router.navigate([`/live-inv/${this.salaActual || 'Live'}/${this.portActual}`]);
      }
    });
   }
  private apuestaSubscription: Subscription | undefined;
  private booleanStateSubscription: Subscription | undefined;
  isOpenBetModalOpen = false;
  isCloseBetModalOpen = false;
  isChooseModalOpen = false;
  
  // Propiedad para el modal del chat
  isChatModalOpen = false;
  
  // Propiedades para el botón flotante arrastrable
  isDragging = false;
  buttonPosition = { x: 20, y: 20 }; // Posición inicial
  dragOffset = { x: 0, y: 0 };
  dragStartTime = 0;
  dragStartPosition = { x: 0, y: 0 };

  toggleBooleanState() {
    this.apuestaService.getEstadoApuesta().pipe(take(1)).subscribe((data: { estadoApuesta: boolean; rondaActual: number, ganador: string, rondasEnEspera?: number[] }) => {
      const state = data.estadoApuesta;
      this.estadoApuesta = state;
      
      // Actualizar la lista de rondas en espera
      if (data.rondasEnEspera) {
        this.rondasEnEspera = data.rondasEnEspera;
      }
      
      if (state) {
        // Si el estado actual es "abierto", abrir el modal de "Cerrar Apuestas"
        this.isCloseBetModalOpen = true;
        this.isOpenBetModalOpen = false;
        this.textButton = 'Cerrar Apuestas';
      } else {
        // Si hay rondas en espera o la actual sin ganador, mostrar modal de escoger ganador
        if (data.ganador != '') {
          this.isOpenBetModalOpen = true;
          this.isCloseBetModalOpen = false;
          this.textButton = 'Abrir Apuestas';
        }
        else {
          this.isChooseModalOpen = true;
          // Cuando el botón dice "Escoger Ganador", debe seleccionar la ronda que se acaba de cerrar
          this.rondaSeleccionada = this.rondaActualCerrada > 0 ? this.rondaActualCerrada : data.rondaActual;
          this.textButton = 'Escoger Ganador';
        }
      }
      // Cambiar el estado en el SharedService
      this.sharedService.changeBooleanState(!state);
    });
    this.apuestaService.ganador.subscribe((data: any) => {
      console.log('Publicacion del ganador!:', data);
      this.ganadorPublicado = data;
    });
  }
    reiniciarContadorRondas() {
  if(confirm('¿Estás seguro de reiniciar el contador de rondas? Esto debe hacerse solo al iniciar un nuevo stream.')) {
    this.apuestaService.reiniciarContadorRondas(this.salaActual);
    this.ultimaRondaValida = 0;
  }
  }
  // Método para abrir directamente el modal de nueva ronda
  abrirNuevaRonda() {
    // Guardar la ronda actual como ronda anterior antes de abrir una nueva
    this.rondaAnterior = this.numeroPelea;
    this.isOpenBetModalOpen = true;
    this.isChooseModalOpen = false;
  }

  handleOpenBets(data: {fightNumber: number, redTeamName: string, greenTeamName: string, redPoints: number, greenPoints: number}) {
     if (data.fightNumber <= this.ultimaRondaValida) {
    alert(`Error: La ronda ${data.fightNumber} debe ser mayor a ${this.ultimaRondaValida}`);
    return;
  }
    // Si estamos abriendo una nueva ronda sin escoger ganador de la anterior
    if (this.numeroPelea > 0 && !this.estadoApuesta && this.textButton === 'Escoger Ganador') {
      // Guardar la ronda actual como ronda anterior
      this.rondaAnterior = this.numeroPelea;
    }
    
    this.numeroPelea = data.fightNumber;
    this.apuestaService.abrirApuestas(this.salaActual, data.fightNumber, data.redTeamName, data.greenTeamName, data.redPoints, data.greenPoints);
    this.closeOpenBetModal();
  }

  handleChooseWinner(winner: string) {
    console.log("Escogiendo ganador:", winner, "para la ronda:", this.rondaSeleccionada);
    this.apuestaService.escogerGanador(this.salaActual, winner, this.rondaSeleccionada);
    
    // Si la ronda seleccionada es la que acaba de cerrarse, limpiar la variable
    if (this.rondaSeleccionada === this.rondaActualCerrada) {
      this.rondaActualCerrada = 0;
    }
    
    // Si la ronda seleccionada es la anterior, limpiar la variable
    if (this.rondaSeleccionada === this.rondaAnterior) {
      this.rondaAnterior = 0;
    }
    this.closeChooseModal();
  }

  handleCloseBets() {
    // Guardar la ronda que se está cerrando ahora para poder seleccionar su ganador
    this.rondaActualCerrada = this.numeroPelea;
    this.apuestaService.cerrarApuestas(this.salaActual);
    this.closeCloseBetModal(); // Cierra el modal
  }

  // Método para seleccionar una ronda específica y mostrar el modal de ganador
  seleccionarRonda(ronda: number) {
    this.rondaSeleccionada = ronda;
    this.isChooseModalOpen = true;
  }

  closeOpenBetModal() {
    this.isOpenBetModalOpen = false;
  }

  closeCloseBetModal() {
    this.isCloseBetModalOpen = false;
  }

  closeChooseModal() {
    this.isChooseModalOpen = false;
  }

  // Métodos para el modal del chat
  openChatModal(): void {
    // Solo abrir el modal si no está arrastrando
    if (!this.isDragging) {
      console.log('Opening chat modal');
      this.isChatModalOpen = true;
    }
  }

  closeChatModal(): void {
    console.log('Closing chat modal from parent');
    this.isChatModalOpen = false;
  }

  // Métodos para el botón flotante arrastrable
  onMouseDown(event: MouseEvent): void {
    this.isDragging = false; // Inicialmente no está arrastrando
    this.dragStartTime = Date.now();
    this.dragStartPosition = { x: event.clientX, y: event.clientY };
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.dragOffset.x = event.clientX - rect.left;
    this.dragOffset.y = event.clientY - rect.top;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) {
      // Verificar si está arrastrando (distancia mínima y tiempo)
      const distance = Math.sqrt(
        Math.pow(event.clientX - this.dragStartPosition.x, 2) +
        Math.pow(event.clientY - this.dragStartPosition.y, 2)
      );
      
      if (distance > 5 && Date.now() - this.dragStartTime > 100) {
        this.isDragging = true;
      }
    }
    
    if (this.isDragging) {
      const newX = event.clientX - this.dragOffset.x;
      const newY = event.clientY - this.dragOffset.y;
      
      // Limitar el botón dentro de los límites de la ventana
      const maxX = window.innerWidth - 80; // Ancho del botón
      const maxY = window.innerHeight - 60; // Alto del botón
      
      this.buttonPosition.x = Math.max(0, Math.min(newX, maxX));
      this.buttonPosition.y = Math.max(0, Math.min(newY, maxY));
    }
  }

  onMouseUp(): void {
    this.isDragging = false;
    this.saveButtonPosition();
  }

  onTouchStart(event: TouchEvent): void {
    this.isDragging = false; // Inicialmente no está arrastrando
    this.dragStartTime = Date.now();
    const touch = event.touches[0];
    this.dragStartPosition = { x: touch.clientX, y: touch.clientY };
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.dragOffset.x = touch.clientX - rect.left;
    this.dragOffset.y = touch.clientY - rect.top;
  }

  onTouchMove(event: TouchEvent): void {
    const touch = event.touches[0];
    
    if (!this.isDragging) {
      // Verificar si está arrastrando (distancia mínima y tiempo)
      const distance = Math.sqrt(
        Math.pow(touch.clientX - this.dragStartPosition.x, 2) +
        Math.pow(touch.clientY - this.dragStartPosition.y, 2)
      );
      
      if (distance > 10 && Date.now() - this.dragStartTime > 150) {
        this.isDragging = true;
      }
    }
    
    if (this.isDragging) {
      const newX = touch.clientX - this.dragOffset.x;
      const newY = touch.clientY - this.dragOffset.y;
      
      // Limitar el botón dentro de los límites de la ventana
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 60;
      
      this.buttonPosition.x = Math.max(0, Math.min(newX, maxX));
      this.buttonPosition.y = Math.max(0, Math.min(newY, maxY));
    }
  }

  onTouchEnd(): void {
    this.isDragging = false;
    this.saveButtonPosition();
  }

  // Métodos para persistir la posición del botón
  private loadButtonPosition(): void {
    const savedPosition = localStorage.getItem('chatButtonPosition');
    if (savedPosition) {
      try {
        this.buttonPosition = JSON.parse(savedPosition);
      } catch (error) {
        console.error('Error loading button position:', error);
      }
    }
  }

  private saveButtonPosition(): void {
    localStorage.setItem('chatButtonPosition', JSON.stringify(this.buttonPosition));
  }
  ngOnInit(): void {
    // Cargar posición del botón desde localStorage
    this.loadButtonPosition();
    
    // Agregar event listeners globales para el arrastre
    document.addEventListener('mouseup', () => this.onMouseUp());
    document.addEventListener('touchend', () => this.onTouchEnd());
    
    this.route.params.subscribe(params => {
      this.salaActual = params['sala'];
      this.portActual = params['port'];
      // const isInvitado = localStorage.getItem('Rol') === 'invitado';
      // if(isInvitado){
      //   this.router.navigate([`/live-inv/${this.salaActual || 'Live'}/${this.portActual}`]);
      // }
      this.apuestaService.leaveRoom();
      this.apuestaService.initChat();
      console.log("Conectando a sala:", this.salaActual);
      const username: string = localStorage.getItem("nombreUsuario") || "";
      this.apuestaService.joinRoom(this.salaActual, username);

      // También inicializar el chat service para el modal
      this.chatService.leaveRoom();
      this.chatService.initChat();
      this.chatService.joinRoom(this.salaActual, username);
    });
    
    this.apuestaSubscription = this.apuestaService.getEstadoApuesta().subscribe((data: any) => {
      this.numeroPelea = data.rondaActual;
      this.estadoApuesta = data.estadoApuesta;
      
      // Actualizar la lista de rondas en espera
      if (data.rondasEnEspera) {
        this.rondasEnEspera = data.rondasEnEspera;
        
        // Si hay una ronda anterior y no está en las rondas en espera, resetearla
        if (this.rondaAnterior > 0 && !this.rondasEnEspera.includes(this.rondaAnterior)) {
          this.rondaAnterior = 0;
        }
        
        // Si hay una ronda actual cerrada y no está en las rondas en espera, resetearla
        if (this.rondaActualCerrada > 0 && !this.rondasEnEspera.includes(this.rondaActualCerrada)) {
          this.rondaActualCerrada = 0;
        }
        //Suscripción para delimitar usuarios
        this.apuestaService.ultimaRondaValida.subscribe(numero => {
       this.ultimaRondaValida = numero;
      console.log('Última ronda válida actualizada:', numero);
      });
      }
      
      console.log("estado: ", data);
      if (data.estadoApuesta) {
        this.textButton = 'Cerrar Apuestas';
      }
      else {
        console.log("ultimo ganador: ", data.ganador);
        if (data.ganador != '') {
          this.textButton = 'Abrir Apuestas';
        }
        else {
          this.textButton = 'Escoger Ganador';
        }
      }
    });
    
    // Suscribirse a actualizaciones de rondas en espera
    this.apuestaService.rondasEnEspera.subscribe((rondas: number[]) => {
      this.rondasEnEspera = rondas;
      console.log('Rondas en espera actualizadas:', this.rondasEnEspera);
      
      // Si hay una ronda anterior y no está en las rondas en espera, resetearla
      if (this.rondaAnterior > 0 && !this.rondasEnEspera.includes(this.rondaAnterior)) {
        this.rondaAnterior = 0;
      }
      
      // Si hay una ronda actual cerrada y no está en las rondas en espera, resetearla
      if (this.rondaActualCerrada > 0 && !this.rondasEnEspera.includes(this.rondaActualCerrada)) {
        this.rondaActualCerrada = 0;
      }
    });
    

    
    this.apuestaSubscription = this.apuestaService.chat$.subscribe(messages => {
      console.log("apuestas: ", this.chat$);
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
      this.estadoApuesta = valor as boolean;
      this.textButton = valor ? 'Cerrar Apuestas' : 'Abrir Apuestas';
    });

    // Suscripción a los totales de apuestas
    this.apuestaService.cantidadApuestasRojo.subscribe((cantidad: number) => {
      this.cantidadApostadaRojo = cantidad;
    });

    this.apuestaService.cantidadApuestasVerde.subscribe((cantidad: number) => {
      this.cantidadApostadaVerde = cantidad;
    });

    // Suscripción a los nombres y puntos de equipos
    this.apuestaService.getEstadoApuesta().subscribe((data: any) => {
      if (data.teamInfo) {
        this.redTeamName = data.teamInfo.redTeamName;
        this.greenTeamName = data.teamInfo.greenTeamName;
        this.redPoints = data.teamInfo.redPoints;
        this.greenPoints = data.teamInfo.greenPoints;
      }
    });
  }

  ngOnDestroy() {
    this.apuestaSubscription?.unsubscribe();
    this.booleanStateSubscription?.unsubscribe();
    
    // Limpiar event listeners globales
    document.removeEventListener('mouseup', () => this.onMouseUp());
    document.removeEventListener('touchend', () => this.onTouchEnd());
  }

  public connectedUsers: any;
  username: string = localStorage.getItem('nombreUsuario') ?? '';
  userPhoto: string = this.getImage(this.username);
  isPopupOpen = false; // Estado para el pop-up
  users: UserType[] = [];
  public getImage(username: string): any {
    return this.usersService.getImageUrl(username);
  }

  selectTeam(team: 'rojo' | 'verde' | 'empate'): void {
    if (team === 'rojo') {
      this.apuesta.rojo = 'rojo';
      this.apuesta.verde = '';
      this.apuesta.empate = '';
    } else if (team === 'verde') {
      this.apuesta.verde = 'verde';
      this.apuesta.rojo = '';
      this.apuesta.empate = '';
    } else if (team === 'empate') {
      this.apuesta.empate = 'empate';
      this.apuesta.rojo = '';
      this.apuesta.verde = '';
    }
    this.selectedTeam = team;
  }

  userService = inject(UsersService);

  logout() {
    localStorage.removeItem('tokenLogin');
    localStorage.removeItem('nombreUsuario');
    this.router.navigate([`/`]);
  }

  inicio() {
    this.router.navigate([`/Inicio`]);
  }

  esAdmin(): boolean {
    const rol = localStorage.getItem("Rol") || "";
    const esSuperAdmin = rol === 'superUsuario' || rol === 'administrador';
    return esSuperAdmin;
  }

  esInvitado(): boolean {
    const rol = localStorage.getItem("Rol") || "";
    const esInvitado = rol === 'invitado';
    return esInvitado;
  }

  openPopup() {
    if (this.esAdmin()) {
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

  apostar(cantidad: string) {
    const cantidadNumerica = Number(cantidad);
    if (isNaN(cantidadNumerica)) {
      console.error('El valor ingresado no es un número válido.');
      return;
    }
    this.apuestaService.sendMessage({
      username: this.username,
      rojo: this.apuesta.rojo,
      verde: this.apuesta.verde,
      empate: this.apuesta.empate,
      cantidad: cantidadNumerica // Asegurarse de que sea un número
    });
  }

  esVerde(verde: any) {
    return verde !== "";
  }
  irMiPerfil(): void {
    this.router.navigate(['/mi-perfil']);
  }
  
}

interface UserType {
  name: string;
  avatar: string;
  slogan: string;
  id: string;
}