import { Socket } from 'ngx-socket-io';
import { BehaviorSubject ,Observable,Subject} from 'rxjs';
import { Injectable,inject } from '@angular/core';
import {HttpClient} from  '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  public socket: Socket;
  private httpClient = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private Port = environment.PORT;
  private baseUrl: string;

// Agrega al servicio - propiedades para chat privado
private activeChatTabsSubject = new BehaviorSubject<{user: string, unread: number}[]>([]);
private currentPrivateChatSubject = new BehaviorSubject<string>('');
private privateMessagesSubject = new BehaviorSubject<any[]>([]);
selectedUser: any = null;

startPrivateChat(user: any) {
  this.selectedUser = user;
  // Aquí podrías cargar el historial de mensajes con este usuario
}

// Modifica el método getConnectedUsers
getConnectedUsers(): Observable<any[]> {
  return new Observable(observer => {
    const handler = (users: any[]) => {
      if (!Array.isArray(users)) {
        users = [];
      }
      this._users$.next(users);
      observer.next(users);
    };
    
    this.socket.on('users_list', handler);
    this.socket.emit('get_users');
    
    return () => {
      this.socket.removeListener('users_list', handler);
    };
  });
}

public refreshUsers() {
  this.socket.emit('get_users');
}

// Al conectar un usuario
setUserInfo(username: string, avatar: string): void {
  this.socket.emit('set_user_info', { username, avatar });
}

getCurrentPrivateChat$(): Observable<string> {
  return this.currentPrivateChatSubject.asObservable();
}
getPrivateMessages$(): Observable<any[]> {
  return this.privateMessagesSubject.asObservable();
}
getActiveChatTabs$(): Observable<{user: string, unread: number}[]> {
  return this.activeChatTabsSubject.asObservable();
}
setCurrentPrivateChat(username: string) {
  this.currentPrivateChatSubject.next(username);
  this.clearUnreadCount(username); 
}
loadPrivateMessages(userId: string): Observable<any> {
    // Usar httpClient en lugar de http
    return this.httpClient.get(`${this.apiUrl}/private-messages/${userId}`);
  }

sendPrivateMessage(toUser: string, content: string) {
  const username = localStorage.getItem('nombreUsuario') || 'Anónimo';
  const privateMessage = `[PRIVADO para ${toUser}] ${content}`;
  const roomCurrent = this._room$.getValue();
  
  if (roomCurrent) {
    this.sendMessage({ 
      username: username, 
      message: privateMessage, 
      room: roomCurrent 
    });
  }
  
  const message = {
    from: username,
    to: toUser,
    content: content,
    timestamp: new Date()
  };
  
  const currentMessages = this.privateMessagesSubject.value;
  this.privateMessagesSubject.next([...currentMessages, message]);
}

sendPrivateMessageWithImage(toUser: string, content: string, image: File) {
  const username = localStorage.getItem('nombreUsuario') || 'Anónimo';
  const privateMessage = `[PRIVADO para ${toUser}] ${content}`;
  const roomCurrent = this._room$.getValue();
  
  if (roomCurrent) {
    this.sendMessageWithImage({ 
      username: username, 
      message: privateMessage, 
      room: roomCurrent 
    }, image);
  }
}

addChatTab(username: string) {
  const currentTabs = this.activeChatTabsSubject.value;
  if (!currentTabs.some(tab => tab.user === username)) {
    this.activeChatTabsSubject.next([...currentTabs, {user: username, unread: 0}]);
  }
}
joinPrivateChat(userId: string): void {
  this.socket.emit('private-chat', { userId });
}

sendSystemMessage(message: string, room: string) {
  this.socket.emit('system-message', {
    message,
    room
  });
}

updateUnreadCount(username: string) {
  const currentTabs = this.activeChatTabsSubject.value;
  const updatedTabs = currentTabs.map(tab => {
    if (tab.user === username && this.currentPrivateChatSubject.value !== username) {
      return {...tab, unread: tab.unread + 1};
    }
    return tab;
  });
  this.activeChatTabsSubject.next(updatedTabs);
}

clearUnreadCount(username: string) {
  const currentTabs = this.activeChatTabsSubject.value;
  const updatedTabs = currentTabs.map(tab => {
    if (tab.user === username) {
      return {...tab, unread: 0};
    }
    return tab;
  });
  this.activeChatTabsSubject.next(updatedTabs);
}

  private _users$ = new BehaviorSubject<UserType[]>([]);
  public users$ = this._users$.asObservable();

  //public _userCount$ = new BehaviorSubject<number>(0);
  public _userCount$ = this._users$.getValue().length;
  private _chat$ = new BehaviorSubject<ChatType[]>([]);
  public chat$ = this._chat$.asObservable();

  private _room$ = new BehaviorSubject<string | null>(null);
  private username:String = '';

  // Obtener el username del token o asignar 'Anonimo' si no existe




  constructor(socket: Socket) {
    // Log global para todos los eventos recibidos por el socket
    const originalEmit = socket.emit;
    socket.emit = function(...args) {
      console.log('[Socket Emit]', ...args);
      return originalEmit.apply(socket, args);
    };
    // Procesar mensajeSala como historial (compatibilidad)
    socket.fromEvent<any[]>('mensajeSala').subscribe((data) => {
      console.log('Recibido evento: mensajeSala', data);
      
      // Solo aceptar historial si el chat está vacío
      const currentMessages = this._chat$.getValue();
      if (currentMessages.length > 0) {
        console.log('🚫 Chat ya tiene mensajes, ignorando historial para preservar conversación actual');
        return;
      }
      
      if (data && Array.isArray(data) && data.length > 0) {
        console.log('✅ Chat vacío, cargando historial');
        this._chat$.next([]);
        data.forEach((item: any) => {
          const {_id, message, contenido, image, username, fecha, date} = item;
          const msgText = message ?? contenido;
          const msgDate = date || fecha || new Date();
          var validImage = image !== '';
          const chatObject: ChatType = {
            _id: _id,
            user: {
              avatar: '',
              name: username,
              id: _id,
              slogan: '',
            },
            message: msgText,
            image,
            validImage,
            date: msgDate
          };
          this.setChat(chatObject);
        });
      }
    });
    this.socket = socket;
    this.baseUrl = `${this.apiUrl}:444/api/mensajes`;

    // Suscribirse a mensajes históricos enviados por el backend
    socket.fromEvent<any[]>('mensajes_historial').subscribe((data) => {
      console.log('[Socket] Recibido evento: mensajes_historial', data);
      // Solo limpiar si recibimos datos del historial y no hay mensajes actuales
      const currentMessages = this._chat$.getValue();
      if (data && Array.isArray(data) && data.length > 0) {
        // Solo limpiar si es realmente necesario (cuando es un nuevo conjunto de mensajes históricos)
        if (currentMessages.length === 0 || data.length > currentMessages.length) {
          this._chat$.next([]);
        }
        data.forEach((item: any) => {
          const {_id, contenido, image, username, fecha} = item;
          const message = contenido;
          const date = fecha;
          var validImage = image !== '';
          const chatObject: ChatType = {
            user: {
              avatar: '',
              name: username,
              id: _id,
              slogan: '',
            },
            message,
            image,
            validImage,
            date
          };
          this.setChat(chatObject);
        });
      } else {
        console.log('No hay mensajes históricos o datos inválidos');
      }
    });
    socket.fromEvent('new_message').subscribe((data:any) => {
      console.log('[Socket] Recibido evento: new_message', data);
      const { _id, message, contenido, username, date, fecha} = data;
      const msgText = message || contenido;
      const msgDate = date || fecha || new Date();
      const image = null;
      
      const chatObject: ChatType = {
        _id: _id,
        user: {
          avatar: '',
          name: username,
          id: _id,
          slogan: '',
        },
        message: msgText,
        image,
        validImage : false,
        date: msgDate
      };
      this.setChat(chatObject);
    });

    socket.fromEvent('new_message_with_image').subscribe((data:any) => {
      console.log('[Socket] Recibido evento: new_message_with_image', data);
      const { _id,message, username ,image,date} = data
      
      const chatObject: ChatType = {
        _id: _id,
        user: {
          avatar: '',
          name: username,
          id: _id,
          slogan: '',
        },
        message,
        image,
        validImage: !!(image && image !== '' && image !== 'image'),
        date: date || new Date()
      };
      this.setChat(chatObject);
    });

    // socket.fromEvent('disconnect').subscribe(() => {
    //   const lastRoom = this._room$.getValue();
    //   if (lastRoom) this.joinRoom(lastRoom);
    // });
    
    socket.fromEvent('users_change').subscribe((users: any) => {
      console.log('[Socket] Recibido evento: users_change', users);
      this._users$.next(users);
    });

    socket.fromEvent('users_list').subscribe((users: any) => {
      console.log('[Socket] Recibido evento: users_list', users);
      if (!Array.isArray(users)) {
        console.warn('Los usuarios recibidos no son un array:', users);
        users = [];
      }
      this._users$.next(users);
    });

    socket.fromEvent('leave_user').subscribe(() => {
      console.log('[Socket] Recibido evento: leave_user');
      this.getUsersCount();
    });

    // NOTA: Evento mensajeSala duplicado eliminado - ya se maneja arriba
    // No necesitamos procesar mensajeSala dos veces

    socket.fromEvent<string>("mensajeBorrado").subscribe((mensajeId) => {
      // Lógica para manejar el evento de borrado
      console.log(`Mensaje con ID ${mensajeId} fue eliminado en otro cliente.`);
      this.eliminarMensaje(mensajeId);
    });
    this.socket.on('privateMessage', (message: PrivateMessageType) => {
    const currentMessages = this.privateMessagesSubject.value;
    this.privateMessagesSubject.next([...currentMessages, message]);
    
    if (this.currentPrivateChatSubject.value !== message.from) {
      this.updateUnreadCount(message.from);
    }
    
    this.addChatTab(message.from);
  });
  }


  public setUser(user: UserType): void {
    const current = this._users$.getValue();
    const state = [...current, user];
    this._users$.next(state);
  }

  public setChat(message: ChatType): void {
    console.log('setChat called with message:', message);
    const current = this._chat$.getValue();
    
    // Verificar duplicados por contenido y usuario (más estricto)
    const messageExists = current.some(existingMessage => {
      return (
        existingMessage.user.name === message.user.name &&
        existingMessage.message === message.message &&
        Math.abs(new Date(existingMessage.date).getTime() - new Date(message.date).getTime()) < 5000 // 5 segundos de diferencia
      );
    });
    
    // Solo agregar si no existe y tiene contenido válido
    if (!messageExists && message.message && message.message.trim() !== '') {
      console.log('Adding new message to chat:', message);
      const state = [...current, message];
      this._chat$.next(state);
      console.log('Current chat state:', state);
    } else if (!message.message || message.message.trim() === '') {
      console.log('Message has no content, skipping:', message);
    } else {
      console.log('Message already exists, skipping:', message);
    }
  }

  public initChat(): void {

    this._chat$.next([]);
  }

  //TODO Enviar mensaje desde el FRONT-> BACKEND
  sendMessage(payload: {username:string, message: string, room?:string }) {
    const roomCurrent = this._room$.getValue();
    if (roomCurrent) {
      payload = { ...payload,room: roomCurrent };
      
      // Primero enviar por HTTP para obtener el ID
      const httpPayload = {
        username: payload.username,
        message: payload.message,
        room: roomCurrent
      };
      
      this.httpClient.post<any>(`${this.baseUrl}/enviarMensaje`, httpPayload)
        .subscribe(
          (response) => {
            // El backend ya maneja el Socket.IO, no necesitamos emitir aquí
            console.log('Mensaje enviado exitosamente');
          },
          (error) => {
            console.error('Error al enviar mensaje:', error);
            // Si falla HTTP, enviar por socket como fallback
            this.socket.emit('event_message', payload);
          }
        );
    }
  }
  sendMessageWithImage(payload: {username:string, message: string ,room?:string,_id?:any },image?:any) {
    const roomCurrent = this._room$.getValue();
    if (roomCurrent) {
      const formData = new FormData();
      formData.append('file', image || '');
      formData.append('username', payload.username || '');
      formData.append('message', payload.message || '');
      formData.append('room', roomCurrent || '');
      payload = { ...payload,room: roomCurrent };     
      
      this.httpClient.post<any>(`${this.baseUrl}/enviarMensaje-with-image`, formData)
        .subscribe(
          (response) => {
            const messageId = response.messageId;
            payload._id = messageId;
            this.socket.emit('event_message_with_image', payload);
          },
          (error) => {
            console.error('Error al enviar la imagen:', error);
          }
        );
    }
  }

  public joinRoom(room: string, username: string, avatar: string = '', slogan: string = '') {
    const rol = localStorage.getItem('Rol') || '';
    this.socket.emit('event_join', { room, username, avatar, slogan, rol });
    this._room$.next(room);
    
    // Solo solicitar historial si el chat está completamente vacío
    const currentMessages = this._chat$.getValue();
    if (currentMessages.length === 0) {
      console.log('Chat vacío, solicitando historial...');
      setTimeout(() => {
        this.socket.emit('request_history', { room });
      }, 500); // Pequeño delay para asegurar conexión
    } else {
      console.log('Chat tiene mensajes, NO solicitando historial');
    }
  }

  leaveRoom(): void {
    const room = this._room$.getValue();
    const username = this.username;
    const payload = {room,username};
    this.socket.emit('event_leave', payload);
    this.getUsersCount();
  }

  getMessage() {
    return this.socket.fromEvent('message');
  }
  deleteMessage(mensajeId:string) {
    this.socket.emit('borrarMensaje', mensajeId);
  }

  getDateNow() {
    this.socket.emit('getDateNow');
    return this.socket.fromEvent('getDate');
  }

  public eliminarMensaje(mensajeId: string): void {
    const mensajesActuales = this._chat$.getValue();
    const mensajesFiltrados = mensajesActuales.filter((mensaje) => {
      const messageId = mensaje._id || mensaje.user.id;
      return messageId !== mensajeId && messageId.toString() !== mensajeId;
    });
    this._chat$.next(mensajesFiltrados);
  }

  public getUsersCount(){
    this.socket.emit('usersCount');
    return this.socket.fromEvent('getUsersCount');
  }
}

interface UserType {
  name: string;
  avatar: string;
  slogan: string;
  id: string;
  rol?: string;
}

interface ChatType {
  _id?: string; // ID del mensaje desde MongoDB
  user: UserType;
  message: string;
  date: Date | string; // Permitir tanto Date como string
  image:any;
  validImage:boolean;
}

interface PrivateMessageType {
  from: string;
  to: string;
  content: string;
  timestamp: Date;
}

