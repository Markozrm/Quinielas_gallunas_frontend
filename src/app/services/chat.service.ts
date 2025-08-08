import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService {
  public socket: Socket;

  constructor() {
    this.socket = io(`${environment.apiUrl}:${environment.PORT}`, { transports: ['websocket'] });
  }
}