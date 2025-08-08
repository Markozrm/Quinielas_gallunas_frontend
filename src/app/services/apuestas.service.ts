import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { io, Socket } from 'socket.io-client'; // Importar de socket.io-client directamente
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class apuestaService {
  private httpClient = inject(HttpClient);
  private apiUrl = environment.apiUrl_apuestas;
  private Port = environment.apuesta_PORT;
  private baseUrl: string;

  private _users$ = new BehaviorSubject<UserType[]>([]);
  public users$ = this._users$.asObservable();
  private _estadoApuesta = new BehaviorSubject<Boolean>(false);
  public estadoApuesta = this._estadoApuesta.asObservable();
  private _apuestaSugerida = new BehaviorSubject<any>(null);
  public apuestaSugerida = this._apuestaSugerida.asObservable();
  private _rondaActual = new BehaviorSubject<number>(0);
  public rondaActual = this._rondaActual.asObservable();

  private _ganador = new BehaviorSubject<String>('');
  public ganador = this._ganador.asObservable();

  //Nueva propiedad para validar las rondas 
  private _ultimaRondaValida = new BehaviorSubject<number>(0);
public ultimaRondaValida = this._ultimaRondaValida.asObservable();

  // Nueva propiedad para manejar rondas en espera
  private _rondasEnEspera = new BehaviorSubject<number[]>([]);
  public rondasEnEspera = this._rondasEnEspera.asObservable();

  // Verde
  private _cantidadApuestasVerde = new BehaviorSubject<number>(0);
  public cantidadApuestasVerde = this._cantidadApuestasVerde.asObservable();
  
  // Rojo
  private _cantidadApuestasRojo = new BehaviorSubject<number>(0);
  public cantidadApuestasRojo = this._cantidadApuestasRojo.asObservable();

  // Empate
  private _cantidadApuestasEmpate = new BehaviorSubject<number>(0);
  public cantidadApuestasEmpate = this._cantidadApuestasEmpate.asObservable();

  // Nueva propiedad para las notificaciones personales
  private _notificacionPersonal = new BehaviorSubject<NotificacionType | null>(null);
  public notificacionPersonal = this._notificacionPersonal.asObservable();

  // Agregar un nuevo BehaviorSubject para notificaciones globales
  private _notificacionGlobal = new BehaviorSubject<NotificacionType | null>(null);
  public notificacionGlobal = this._notificacionGlobal.asObservable();

  public _userCount$ = this._users$.getValue().length;
  private _chat$ = new BehaviorSubject<ChatType[]>([]);
  public chat$ = this._chat$.asObservable();

  private _room$ = new BehaviorSubject<string | null>(null);
  private username: string = '';
  private socket: Socket;

  private saldoActualizado$ = new BehaviorSubject<number>(0);

  constructor() {
    this.baseUrl = `${this.apiUrl}:444/api/apuestas`;
    
    // Inicializa el socket usando la librería nativa de socket.io-client
    this.socket = io(`${this.apiUrl}:${this.Port}`, {
      transports: ['websocket'],
    });

    // Escucha los eventos directamente usando "fromEvent"
    this.listenForEvents();
  }

  // Función para escuchar los eventos
  private listenForEvents() {
    fromEvent(this.socket, 'new_message').subscribe((data: any) => {
      console.log('data de ingreso:', data);
      const { _id, username, rojo, verde, cantidad, date, ronda, estado } = data;
      const chatObject: ChatType = {
        user: {
          avatar: '',
          name: username,
          id: _id,
          slogan: '',
        },
        rojo,
        verde,
        cantidad,
        date,
        ronda,
        estado
      };
      this.setChat(chatObject);
    });
    fromEvent(this.socket, 'error_ronda').subscribe((mensaje: string) => {
  alert(`Error en ronda: ${mensaje}`); // O usar tu sistema de notificaciones
});

//Metodo parsa las rondas 
fromEvent(this.socket, 'update_ultima_ronda').subscribe((numero: number) => {
  this._ultimaRondaValida.next(numero);
});
    fromEvent(this.socket, 'users_change').subscribe((users: any) => {
      this._users$.next(users);
    });
    
    fromEvent(this.socket, 'getApuesta').subscribe((data: any) => {
      console.log("data del estado de las apuestas", data);
      this._estadoApuesta.next(data.estadoApuesta);
      this._rondaActual.next(data.rondaActual);
      
      // Manejar información de rondas en espera
      if (data.rondasEnEspera) {
        this._rondasEnEspera.next(data.rondasEnEspera);
      }
      
      // Emitir datos de los equipos si existen
      if (data.teamInfo) {
        console.log("Información de equipos recibida:", data.teamInfo);
      }
    });
    
    // Escuchar actualizaciones de rondas en espera
    fromEvent(this.socket, 'rondas_en_espera').subscribe((rondas: any) => {
      console.log("Rondas en espera recibidas:", rondas);
      this._rondasEnEspera.next(rondas);
    });
    
    fromEvent(this.socket, 'rondas_en_espera_actualizadas').subscribe((rondas: any) => {
      console.log("Rondas en espera actualizadas:", rondas);
      this._rondasEnEspera.next(rondas);
    });
    
    fromEvent(this.socket, 'ronda_en_espera').subscribe((data: any) => {
      console.log("Ronda pasada a espera:", data);
      // Actualizar la lista de rondas en espera
      const rondasActuales = this._rondasEnEspera.getValue();
      if (!rondasActuales.includes(data.numeroRonda)) {
        this._rondasEnEspera.next([...rondasActuales, data.numeroRonda]);
      }
    });
    
    // Nueva suscripción al evento update_cantidades
    fromEvent(this.socket, 'update_cantidades').subscribe((data: any) => {
      console.log("Actualización de cantidades recibida:", data);
      this._cantidadApuestasVerde.next(data.cantidadApostadaVerde);
      this._cantidadApuestasRojo.next(data.cantidadApostadaRojo);
      this._cantidadApuestasEmpate.next(data.cantidadApostadaEmpate);
    });
    
    fromEvent(this.socket, 'notificacion_personal').subscribe((notificacion: any) => {
      console.log('Notificación personal recibida:', notificacion);
      this._notificacionPersonal.next(notificacion);
    });
    
    // Agregar listener para la notificación global
    fromEvent(this.socket, 'notificacion_global').subscribe((notificacion: any) => {
      console.log('Notificación global recibida:', notificacion);
      this._notificacionGlobal.next(notificacion);
    });
    
    fromEvent(this.socket, 'sugerencia_apuesta').subscribe((data: any) => {
      if (data != null) {
        this._apuestaSugerida.next(data);
      } else {
        this._apuestaSugerida.next(null);
      }
    });
    
    fromEvent(this.socket, 'publicarGanador').subscribe((data: any) => {
      console.log("GANADOR!: ", data);
      this._ganador.next(data.ganador);
    });
    
    fromEvent(this.socket, 'leave_user').subscribe(() => {
      this.getUsersCount();
    });

    fromEvent(this.socket, 'apuestaSala').subscribe((data: any) => {
      if (!Array.isArray(data) || data.length === 0) {
        return; // Detener la ejecución si no hay datos
      }
      this.initChat();
      data.forEach((item: any) => {
        console.log(item);
        const { _id, cantidad, username, rojo, verde, date, ronda, estado } = item;
        const chatObject: ChatType = {
          user: {
            avatar: '',
            name: username,
            id: _id,
            slogan: '',
          },
          cantidad,
          rojo,
          verde,
          date,
          ronda,
          estado
        };
        this.setChat(chatObject);
      });

      fromEvent(this.socket, 'apuestaBorrado').subscribe((apuestaId: string) => {
        console.log(`Apuesta con ID ${apuestaId} fue eliminada en otro cliente.`);
        this.eliminarApuesta(apuestaId);
      });
    });

  }

  getSaldoActualizado(): Observable<number> {
    return this.saldoActualizado$.asObservable();
  }

  public setUser(user: UserType): void {
    const current = this._users$.getValue();
    const state = [...current, user];
    this._users$.next(state);
  }
  public reiniciarContadorRondas(room: string): void {
  this.socket.emit('reiniciar_contador_rondas', room);
}
  public setChat(message: ChatType): void {
    const current = this._chat$.getValue();
    const state = [...current, message];
    this._chat$.next(state);
  }

  public initChat(): void {
    this._chat$.next([]);
  }

  // Enviar apuesta desde el frontend al backend
  sendMessage(payload: { username: string; rojo: string; verde: string; empate: string; cantidad: number; room?: string }) {
    const roomCurrent = this._room$.getValue();
    if (roomCurrent) {
      payload = { ...payload, room: roomCurrent, cantidad: Number(payload.cantidad) }; // Asegurarse de que sea un número
      console.log(roomCurrent);
      this.socket.emit('event_message', payload);
    }
  }

  joinRoom(room: string, username: string): void {
    this.username = username;
    this._room$.next(room);
    const rol = localStorage.getItem('Rol') || '';
    const avatar = localStorage.getItem('avatar') || 'assets/logoPrincipal.PNG';
    const slogan = localStorage.getItem('slogan') || '';
    const payload = { room, username, rol, avatar, slogan };
    this.socket.emit('event_join', payload);
    this.socket.emit('get_cantidades', room);
  }

  leaveRoom(): void {
    const room = this._room$.getValue();
    const username = this.username;
    const payload = { room, username };
    this.socket.emit('event_leave', payload);
    this.getUsersCount();
  }

  cerrarApuestas(room: string): void {
    this._room$.next(room);
    console.log("room:",this._room$.getValue())
    this.socket.emit('cerrar_apuestas', room);
  }
  
  abrirApuestas(room: string, ronda: number, redTeamName: string, greenTeamName: string, redPoints: number, greenPoints: number): void {
  const ultimaValida = this.getUltimaRondaValida();
  
  if (ronda <= ultimaValida) {
    alert(`Error: La ronda ${ronda} debe ser mayor a ${ultimaValida}`);
    return;
  } 
    console.log("numero de pelea: ",ronda);
    this._room$.next(room);
    this.initChat();
    console.log("room:",this._room$.getValue())
    const payload = {
      room,
      ronda,
      redTeamName,
      greenTeamName,
      redPoints,
      greenPoints
    }
    this.socket.emit('abrir_apuestas', payload);
  }
  
  escogerGanador(room: string, ganador: string, ronda: number): void {
    this._room$.next(room);
    console.log(`Escogiendo ganador ${ganador} para la ronda ${ronda} en sala ${room}`);
    const payload = {room, ganador, ronda};
    this.socket.emit('escoger_ganador', payload);
  }
  
  // Método para obtener información de una ronda específica
  getRondaInfo(ronda: number): Observable<any> {
    const room = this._room$.getValue();
    if (room) {
      this.socket.emit('getRondaInfo', { room, ronda });
    }
    return fromEvent(this.socket, 'ronda_info');
  }
  
  getEstadoApuesta(): Observable<any>{
    const room = this._room$.getValue();
    if (room) {
      this.socket.emit('getEstadoApuesta', room);
    }
    return fromEvent(this.socket,'getApuesta'); 
  }
  
  getCantidades(): Observable<any>{
    const room = this._room$.getValue();
    if (room) {
      this.socket.emit('get_cantidades', room);
    }
    return fromEvent(this.socket,'update_cantidades_client'); 
  }
  
  getMessage(): Observable<any> {
    return fromEvent(this.socket, 'message');
  }

  deleteMessage(apuestaId: string) {
    const room = this._room$.getValue();
    if (room) {
      this.socket.emit('borrarapuesta', { apuestaId, room });
    }
  }

  getDateNow(): Observable<any> {
    this.socket.emit('getDateNow'); // Emite el evento para obtener la fecha del backend
    return fromEvent(this.socket, 'getDate'); // Devuelve el observable del evento 'getDate'
  }

  public eliminarApuesta(apuestaId: string): void {
    const apuestasActuales = this._chat$.getValue();
    const apuestasFiltradas = apuestasActuales.filter((apuesta) => apuesta.user.id !== apuestaId);
    this._chat$.next(apuestasFiltradas);
  }

  public getUsersCount(): Observable<any> {
    this.socket.emit('usersCount');
    return fromEvent(this.socket, 'getUsersCount');
  }

  // Método para obtener el valor actual de usuarios
  public getCurrentUsers(): UserType[] {
    return this._users$.getValue();
  }
    public getUltimaRondaValida(): number {
  return this._ultimaRondaValida.getValue();
    }
  // Método para obtener todas las apuestas de una sala (todas las rondas)
  public obtenerTodasApuestas(sala: string): Observable<any> {
    return this.httpClient.get(`${this.baseUrl}/obtenerapuestasBySala/${sala}`);
 
  }
    // Método para obtener todas las apuestas de una sala (todas las rondas)
    public obtenerTodasApuestasAgrupadas(sala: string): Observable<any> {
      return this.httpClient.get(`${this.baseUrl}/obtenerapuestasAgrupadasBySala/${sala}`);
   
    }
  public obtenerResumenStream(sala: string): Observable<{totalStream: number, detalles: any[]}> {
  return this.httpClient.get<{totalStream: number, detalles: any[]}>(
    `${this.baseUrl}/resumen-stream/${sala}`
  );
}
  public obtenerMontosCazados(sala: string): Observable<any> {
  return this.httpClient.get(`${this.baseUrl}/montos-cazados/${sala}`);
}
}

interface UserType {
  name: string;
  avatar: string;
  slogan: string;
  id: string;
  rol?: string;
  isOnline?: boolean;
}

interface ChatType {
  user: UserType;
  rojo: string;
  verde: string;
  cantidad: number;
  date: Date;
  ronda:number;
  estado:string;
}
interface NotificacionType {
  tipo: string;
  mensaje: string;
  detalles: {
    cantidad: number;
    ronda: number;
    sala: string;
    fecha: Date;
  }
}
