import { ChangeDetectorRef } from '@angular/core';
import { Component, OnInit, OnDestroy, inject, Input } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { UsersTypeComponent } from '../users-type/users-type.component';
import { NgFor, AsyncPipe } from '@angular/common';
import { ElementRef ,ViewChild} from '@angular/core';
import { Subscription,of,Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { UsersService } from './../../../services/users.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SharedService } from 'src/app/services/shared.service';


@Component({
    selector: 'app-users-chat',
    templateUrl: './users-chat.component.html',
    styleUrls: ['./users-chat.component.css'],
    standalone: true,
    imports: [NgFor, UsersTypeComponent, AsyncPipe, CommonModule]
})
export class UsersChatComponent implements OnInit, OnDestroy {
  private chatSubscription: Subscription | undefined;
  @ViewChild('chatContainer', { read: ElementRef })
  chatContainer: ElementRef | undefined;
  public scrollable: boolean = true;
  public chat$ = this.chatService.chat$;
  public privateChat$: Observable<any[]> = of([]);
  showDeleteModal: boolean = false;
  selectedMessage: any = null;
  @Input() isPrivate: boolean = false;  
  @Input() targetUser: any = null;

  constructor(
    private chatService: ChatService,
    private usersService: UsersService,
    private sharedService: SharedService,
    private sanitizer: DomSanitizer,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Configurar el observable correcto según el tipo de chat
    if (this.isPrivate && this.targetUser) {
      // Para chat privado, filtrar mensajes del chat general que sean relevantes
      this.privateChat$ = this.chatService.chat$.pipe(
        map(messages => messages.filter(msg => {
          const currentUser = localStorage.getItem('nombreUsuario') || 'Anónimo';
          const isPrivateMessage = msg.message.includes('[PRIVADO para');
          const isForThisUser = msg.message.includes(`[PRIVADO para ${currentUser}]`) || 
                               msg.message.includes(`[PRIVADO para ${this.targetUser.name}]`);
          const isFromThisConversation = (msg.user.name === currentUser && msg.message.includes(`[PRIVADO para ${this.targetUser.name}]`)) ||
                                       (msg.user.name === this.targetUser.name && msg.message.includes(`[PRIVADO para ${currentUser}]`));
          
          return isPrivateMessage && isFromThisConversation;
        }))
      );
    } else {
    }

    this.sharedService.currentBooleanState.subscribe(state => {
      this.scrollable = !state;
    });

    // Suscribirse al observable correcto
    const chatObservable = (this.isPrivate && this.targetUser) ? this.privateChat$ : this.chat$;
    this.chatSubscription = chatObservable.subscribe(messages => {
      if (this.scrollable) {
        this.scrollToBottom();
      }
      this.cd.detectChanges(); // Detectar cambios manualmente
    });
  }

  ngOnDestroy(): void {
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
    }
  }

  sanitizeMessage(message: string): string {
    var result = message;
    if (!message.startsWith('http://') && !message.startsWith('https://')) {
      result = 'https://' + message;
    }
    return result;
  }

  isValidLink(str: string): boolean {
    const urlPattern = new RegExp(
      '^(?:https?:\\/\\/)?' +
      '((?:[a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}' +
      '(?::\\d+)?(?:\\/[-a-z\\d%_.~+]*)*' +
      '(?:\\?[;&a-z\\d%_.~+=-]*)?' +
      '(?:#[-a-z\\d_]*)?$', 'i'
    );
    return urlPattern.test(str);
  }

  // Formato exacto HH:mm
  public formatDate(dateInput: Date | string | any): string {
    try {
      let date: Date;
      if (dateInput instanceof Date) {
        date = dateInput;
      } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        date = new Date(dateInput);
      } else {
        console.warn('Formato de fecha no válido:', dateInput);
        return '--:--';
      }
      if (isNaN(date.getTime())) {
        console.warn('Fecha inválida:', dateInput);
        return '--:--';
      }
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('Error al formatear fecha:', error, dateInput);
      return '--:--';
    }
  }

  // Opción alternativa usando toLocaleTimeString
  public formatTime(dateInput: Date | string | any): string {
    try {
      let date: Date;
      if (dateInput instanceof Date) {
        date = dateInput;
      } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        date = new Date(dateInput);
      } else {
        return '--:--';
      }
      if (isNaN(date.getTime())) {
        return '--:--';
      }
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      return '--:--';
    }
  }

  // Tiempo relativo (hace X minutos)
  public formatRelativeTime(dateInput: Date | string | any): string {
    try {
      let date: Date;
      if (dateInput instanceof Date) {
        date = dateInput;
      } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        date = new Date(dateInput);
      } else {
        return 'fecha inválida';
      }
      if (isNaN(date.getTime())) {
        return 'fecha inválida';
      }
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.round(diffMs / 60000);
      if (diffMin < 1) {
        return 'hace unos segundos';
      } else if (diffMin === 1) {
        return 'hace 1 minuto';
      } else if (diffMin < 60) {
        return `hace ${diffMin} minutos`;
      } else if (diffMin < 120) {
        return 'hace 1 hora';
      } else if (diffMin < 1440) {
        const diffHrs = Math.floor(diffMin / 60);
        return `hace ${diffHrs} horas`;
      } else if (diffMin < 2880) {
        return 'hace 1 día';
      } else {
        const diffDays = Math.floor(diffMin / 1440);
        return `hace ${diffDays} días`;
      }
    } catch (error) {
      return 'fecha inválida';
    }
  }

  public getImage(username: string): any {
    return this.usersService.getImageUrl(username);
  }

  public getImageMsj(id: string): any {
    const response = this.usersService.getImageMsj(id);
    return response;
  }

  public mensajeConImagen(image: any): boolean {
    return image !== '';
  }

  private scrollToBottom(): void {
    const containerElement = this.chatContainer?.nativeElement || null;
    if (containerElement) {
      setTimeout(() => {
        containerElement.scrollTop = containerElement.scrollHeight;
      }, 0);
    }
  }

  eliminarMensaje(mensajeId: string) {
    this.chatService.deleteMessage(mensajeId);
  }

  puedeEliminarMensajes(): boolean {
    const rol = localStorage.getItem("Rol") || "";
    const esSuperAdmin = rol === 'superUsuario' || rol === 'administrador';
    return esSuperAdmin;
  }
  openDeleteConfirm(mensajeId: string): void {
    this.selectedMessage = mensajeId;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedMessage = '';
  }

  confirmDelete(): void {
    if (this.selectedMessage) {
      this.chatService.deleteMessage(this.selectedMessage);
      this.showDeleteModal = false;
      this.selectedMessage = '';
    }
  }

  public getCleanPrivateMessage(message: string): string {
    // Remover el prefijo [PRIVADO para Usuario] del mensaje
    const privateRegex = /^\[PRIVADO para [^\]]+\]\s*/;
    return message.replace(privateRegex, '');
  }

  public isPrivateMessage(message: string): boolean {
    return message.includes('[PRIVADO para');
  }

  public getPublicMessagesCount(messages: any[]): number {
    return messages.filter(msg => !this.isPrivateMessage(msg.message)).length;
  }
}

