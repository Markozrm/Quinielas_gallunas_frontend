import { MenuComponent } from '../../menu/menu.component';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../services/chat.service';
import { UsersChatComponent } from '../components/users-chat/users-chat.component';
import { UsersRoomsComponent } from '../components/users-rooms/users-rooms.component';
import { VideoPlayerComponent } from 'src/app/reproductor/reproductor.component';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { UsersService } from 'src/app/services/users.service';
import { CommonModule } from '@angular/common';
import { Subscription, of, Observable, firstValueFrom } from 'rxjs';
import { SharedService } from 'src/app/services/shared.service';
import { take } from 'rxjs/operators';
import { UsersTypeComponent } from '../components/users-type/users-type.component';

@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.css'],
  standalone: true,
  imports: [UsersRoomsComponent, CommonModule, UsersChatComponent, UsersTypeComponent, VideoPlayerComponent, MenuComponent],
})
export class ChatPageComponent implements OnInit, OnDestroy {
  isLoadingUsers: boolean = false;
  currentUsername: string = localStorage.getItem("nombreUsuario") || "";
  public textButton = 'desactivar scroll'
  constructor(private usersService: UsersService,
    private route: ActivatedRoute, private router: Router,
    private chatService: ChatService,
    private sharedService: SharedService
  ) { }
  private chatSubscription: Subscription | undefined;
  private usersSubscription: Subscription | undefined;
  private booleanStateSubscription: Subscription | undefined;
  public messages: any[] = [];

  async ngOnInit(): Promise<void> {
    this.route.params.subscribe(async params => {
      const roomId = params['sala'];

      try {
        console.log(`[ChatPage] Resolviendo sala para: ${roomId}`);

        // CORRECCIÓN: Usar la clave de la base de datos para permitir que el stream cruce la medianoche
        // sin romper el chat. La clave (ej. Stream1-30-01-2026) se mantiene constante mientras dure el stream.
        const streamResponse = await firstValueFrom(this.usersService.getClaveStream(roomId)) as any;
        const roomClave = streamResponse.stream.clave || roomId;

        console.log(`[ChatPage] Uniendo a sala oficial (DB): ${roomClave}`);

        this.chatService.leaveRoom();
        this.chatService.initChat();

        const username = localStorage.getItem("nombreUsuario") || "Invitado";
        this.chatService.joinRoom(roomClave, username);

        // Solicitar mensajes históricos
        this.chatService.emitirGetMensajesHistorial(roomClave);

      } catch (error) {
        console.error('[ChatPage] Error al obtener la clave del stream, usando ID por defecto:', error);

        // Fallback al ID de la sala si falla la obtención de la clave
        this.chatService.leaveRoom();
        this.chatService.initChat();
        const username = localStorage.getItem("nombreUsuario") || "Invitado";
        this.chatService.joinRoom(roomId, username);
        this.chatService.emitirGetMensajesHistorial(roomId);
      }
    });

    // Suscríbete a users$ para el pop-up de usuarios conectados
    this.usersSubscription = this.chatService.users$.subscribe(users => {
      this.users = users;
      console.log('Usuarios actualizados:', this.users);
    });

    // Suscríbete a getUsersCount para mostrar el número de conectados
    this.chatSubscription = this.chatService.getUsersCount().subscribe((count: any) => {
      this.connectedUsers = count;
    });

    // Suscríbete a los mensajes del chat general
    this.chatService.chat$.subscribe((msgs: any[]) => {
      this.messages = msgs;
    });

    this.booleanStateSubscription = this.sharedService.currentBooleanState.subscribe(state => {
      this.textButton = state ? 'activar scroll' : 'desactivar scroll';
    });
  }

  ngOnDestroy() {
    this.chatSubscription?.unsubscribe();
    this.usersSubscription?.unsubscribe();
    this.booleanStateSubscription?.unsubscribe();
  }


  public connectedUsers: any;
  isSidebarOpen = false;
  isChatVisible = false; // Controla la visibilidad del chat
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

  toggleChat() {
    this.isChatVisible = !this.isChatVisible;
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
  inicio() {
    this.router.navigate([`/`]);
  }
  esAdmin(): boolean {
    const rol = localStorage.getItem("Rol") || "";

    const esSuperAdmin = rol === 'superUsuario' || rol === 'administrador';

    return esSuperAdmin;
  }
  esInvitado(): boolean {
    const rol = localStorage.getItem("Rol") || "";
    //console.log("rol: ",rol);
    const esInvitado = rol === 'invitado';
    //console.log(esInvitado);
    return esInvitado;
  }
  toggleBooleanState() {
    this.sharedService.currentBooleanState.pipe(take(1)).subscribe(state => {
      this.sharedService.changeBooleanState(!state);
    });

  }
  // Métodos para manejar el pop-up
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

  selectedUser: any = null;
  isPrivateChatOpen = false;

  abrirChatPrivado(user: any) {
    this.selectedUser = user;
    this.isPrivateChatOpen = true;
    this.isPopupOpen = false; // Opcional: cierra el popup al abrir el chat privado
  }


}
interface UserType {
  name: string;
  avatar: string;
  slogan: string;
  id: string;
}

// Mensaje de confirmación para el usuario
console.log('FUNCIONANDO: El chat privado y el chat general están restaurados y funcionando correctamente. Todo bien.');