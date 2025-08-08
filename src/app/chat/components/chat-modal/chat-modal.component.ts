import { Component, EventEmitter, Output, OnInit, OnDestroy, Input } from '@angular/core';
import { UsersChatComponent } from '../users-chat/users-chat.component';
import { UsersTypeComponent } from '../users-type/users-type.component';
import { ChatService } from '../../services/chat.service';
import { apuestaService } from 'src/app/services/apuestas.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-modal',
  templateUrl: './chat-modal.component.html',
  styleUrls: ['./chat-modal.component.css'],
  standalone: true,
  imports: [UsersChatComponent, UsersTypeComponent, FormsModule, CommonModule],
})
export class ChatModalComponent implements OnInit, OnDestroy {
  @Output() closeModal = new EventEmitter<void>();
  @Input()
  set isAdmin(value: boolean) {
    console.log('Setting isAdmin to:', value);
    this._isAdmin = value;
  }
  get isAdmin(): boolean {
    return this._isAdmin;
  }
  private _isAdmin: boolean = false;

  currentView: 'general' | 'private' = 'general';
  isLoadingUsers: boolean = true;
  connectedUsers: UserType[] = [];
  selectedUser: UserType | null = null;
  private chatSubscription: Subscription | undefined;
  private currentRoom: string = '';
  public currentUsername: string = '';

  // Getter para obtener usuarios disponibles para chat privado según el rol
  get availableAdmins(): UserType[] {
    const currentUserRole = localStorage.getItem('Rol') || '';
    
    console.log('🔍 Filtrando usuarios para chat privado');
    console.log('👤 Rol del usuario actual:', currentUserRole);
    console.log('📋 Total usuarios conectados:', this.connectedUsers.length);
    
    // Si el usuario actual es administrador o superUsuario, puede ver a todos
    if (currentUserRole === 'administrador' || currentUserRole === 'superUsuario') {
      console.log('✅ Admin: puede chatear con todos los usuarios');
      return this.connectedUsers;
    }
    
    // Para usuarios normales e invitados: solo pueden chatear con administradores
    // Como el backend no envía roles, filtramos por nombres conocidos de admins
    const adminNames = ['MARCOSADMIN', 'admin', 'administrador']; // Agrega aquí nombres de admins conocidos
    
    const availableAdmins = this.connectedUsers.filter(user => {
      // Verificar si el usuario tiene rol de admin en sus datos
      if (user.rol) {
        return user.rol === 'administrador' || user.rol === 'superUsuario';
      }
      
      // Como fallback: verificar si el nombre incluye patrones de admin
      const isAdminByName = adminNames.some(adminName => 
        user.name.toLowerCase().includes(adminName.toLowerCase())
      );
      
      return isAdminByName;
    });
    
    console.log('🎯 Administradores disponibles:', availableAdmins.map(u => u.name));
    return availableAdmins;
  }

  // Método para obtener mensaje cuando no hay usuarios disponibles
  get noUsersMessage(): string {
    const currentUserRole = localStorage.getItem('Rol') || '';
    
    if (currentUserRole === 'administrador' || currentUserRole === 'superUsuario') {
      return 'No hay usuarios conectados';
    }
    
    // Para usuarios normales e invitados
    return 'No hay administradores conectados';
  }

  constructor(private chatService: ChatService, private apuestaService: apuestaService, private route: ActivatedRoute) {
    console.log('ChatModalComponent initialized');
  }

  ngOnInit() {
    console.log('ChatModalComponent ngOnInit');
    this.currentUsername = localStorage.getItem("nombreUsuario") || "";
    this.isLoadingUsers = true;

    // Configurar sala para chat general
    const variableValue = this.route.snapshot.paramMap.get('sala') || 'default';
    
    // Verificar si necesitamos unirse a una nueva sala
    if (this.currentRoom !== variableValue) {
      this.currentRoom = variableValue;
      console.log('Joining room:', variableValue, 'as user:', this.currentUsername);
      this.chatService.joinRoom(variableValue, this.currentUsername);
    }

    // Obtener inmediatamente el valor actual de usuarios para chat privado
    const currentUsers = this.apuestaService.getCurrentUsers();
    console.log('Usuarios conectados encontrados:', currentUsers.length);
    
    if (currentUsers && currentUsers.length > 0) {
      // Marcar todos los usuarios como conectados y filtrar el usuario actual
      this.connectedUsers = currentUsers
        .filter(u => u.name !== this.currentUsername)
        .map(user => ({ ...user, isOnline: true }));
      this.isLoadingUsers = false;
      console.log('Usuarios filtrados para chat:', this.connectedUsers.map(u => u.name));
    }

    // Suscribirse a cambios tanto del chat general como de usuarios para privado
    this.chatSubscription = this.chatService.chat$.subscribe(messages => {
      console.log('ChatModalComponent - Current messages:', messages);
    });

    // Suscribirse a cambios en la lista de usuarios para chat privado
    this.apuestaService.users$.subscribe(users => {
      console.log('Actualizando lista de usuarios, total:', users.length);
      // Marcar todos los usuarios como conectados y filtrar el usuario actual
      this.connectedUsers = users
        .filter(u => u.name !== this.currentUsername)
        .map(user => ({ ...user, isOnline: true }));
      this.isLoadingUsers = false;
    });

    // Solicitar actualización de la lista de usuarios
    this.apuestaService.getUsersCount().subscribe(count => {
      console.log('Contador de usuarios:', count);
    });
  }

  ngOnDestroy() {
    console.log('ChatModalComponent ngOnDestroy');
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
    }
    this.chatService.leaveRoom();
  }

  switchToGeneralChat() {
    this.currentView = 'general';
    this.selectedUser = null;
  }

  startPrivateChat(user: UserType) {
    this.selectedUser = user;
    this.currentView = 'private';
  }

  handlePrivateChat(): void {
    this.currentView = 'private';
    this.selectedUser = null;
    console.log('Cambiando a vista privada');
  }

  onClose() {
    console.log('Chat modal closing, cleaning up...');
    this.close();
  }

  close() {
    console.log('Closing chat modal');
    this.closeModal.emit();
  }

  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/logoPrincipal.PNG';
    }
  }

  backToUserList(): void {
    this.selectedUser = null;
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
  }
}

interface UserType {
  id: string;
  name: string;
  avatar: string;
  slogan: string;
  isOnline?: boolean;
  rol?: string;
}