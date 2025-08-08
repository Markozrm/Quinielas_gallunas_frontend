import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuinielaService {
  private apiUrl = environment.apiUrl_quiniela;
  private http = inject(HttpClient);

  // URL para la API REST (server_login en puerto 444)
  private baseUrl = `${this.apiUrl}:444/api/rifas`;
  
  // URL para el servidor de WebSockets (BINGO_BACKEND en puerto 3449)
  private socketUrl = `${this.apiUrl}:3449`;

  // Usaremos un BehaviorSubject para que los componentes siempre tengan el último valor
  private _rifas$ = new BehaviorSubject<any[]>([]);
  public rifas$ = this._rifas$.asObservable();

  private socket: Socket;
  private username: string = '';

  // Estado reactivo
  private _users$ = new BehaviorSubject<UserType[]>([]);
  private _estadoVentas$ = new BehaviorSubject<boolean>(false);
  private _rifaActual$ = new BehaviorSubject<number>(0);
  private _ganador$ = new BehaviorSubject<{numero: number, username: string} | null>(null);
  private _numerosVendidos$ = new BehaviorSubject<{[key: number]: string}>({});
  private _numerosDisponibles$ = new BehaviorSubject<number[]>([]);
  private _totalRecaudado$ = new BehaviorSubject<number>(0);
  private _notificacionPersonal$ = new BehaviorSubject<NotificacionType | null>(null);
  private _notificacionGlobal$ = new BehaviorSubject<NotificacionType | null>(null);
  private _ventas$ = new BehaviorSubject<VentaType[]>([]);
  private _room$ = new BehaviorSubject<string | null>(null);

  // Observables públicos
  public users$ = this._users$.asObservable();
  public estadoVentas$ = this._estadoVentas$.asObservable();
  public rifaActual$ = this._rifaActual$.asObservable();
  public ganador$ = this._ganador$.asObservable();
  public numerosVendidos$ = this._numerosVendidos$.asObservable();
  public numerosDisponibles$ = this._numerosDisponibles$.asObservable();
  public totalRecaudado$ = this._totalRecaudado$.asObservable();
  public notificacionPersonal$ = this._notificacionPersonal$.asObservable();
  public notificacionGlobal$ = this._notificacionGlobal$.asObservable();
  public ventas$ = this._ventas$.asObservable();
  public room$ = this._room$.asObservable();

  constructor() {
     // Usamos socketUrl para la conexión del WebSocket
     this.socket = io(this.socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    fromEvent(this.socket, 'users_change').subscribe((users: any) => this._users$.next(users));
    fromEvent(this.socket, 'getRifa').subscribe((data: any) => this.updateRifaState(data));
    // fromEvent(this.socket, 'update_numeros').subscribe((data: any) => this.updateNumeros(data)); // <-- ELIMINAR ESTA LÍNEA
    fromEvent(this.socket, 'ventasSala').subscribe((ventas: any) => this._ventas$.next(ventas));
    fromEvent(this.socket, 'ventaBorrada').subscribe(this.removeVenta.bind(this));
    fromEvent(this.socket, 'publicarGanador').subscribe(this.setGanador.bind(this));
    fromEvent(this.socket, 'notificacion_personal').subscribe((notif: any) => this._notificacionPersonal$.next(notif));
    fromEvent(this.socket, 'notificacion_global').subscribe((notif: any) => this._notificacionGlobal$.next(notif));
    fromEvent(this.socket, 'error_rifa').subscribe(this.handleError.bind(this, 'Rifa'));
    fromEvent(this.socket, 'error_compra').subscribe(this.handleError.bind(this, 'Compra'));
    //fromEvent(this.socket, 'error_sorteo').subscribe(this.handleError.bind(this, 'Sorteo'));

    // --- INICIO DE LA CORRECCIÓN ---
    // ELIMINAMOS EL LISTENER DUPLICADO Y LO REEMPLAZAMOS POR ESTE ÚNICO Y CORRECTO
    fromEvent(this.socket, 'rifa_actualizada').subscribe((rifaActualizada: any) => {
      console.log('Rifa actualizada recibida desde el backend:', rifaActualizada);
      
      // Obtenemos la lista actual de rifas que tiene el servicio
      const rifasActuales = this._rifas$.getValue();
      
      // Buscamos el índice de la rifa que necesita ser actualizada
      const index = rifasActuales.findIndex(r => r.numeroRifa === rifaActualizada.numeroRifa);
      
      // Si la encontramos en nuestra lista...
      if (index !== -1) {
        // ...la reemplazamos con la versión nueva que llegó del servidor.
        rifasActuales[index] = rifaActualizada;
        // Emitimos una nueva copia del array para que Angular detecte el cambio y actualice la vista.
        this._rifas$.next([...rifasActuales]);
      }
    });
    // --- FIN DE LA CORRECCIÓN ---
  }

  private updateRifaState(data: any): void {
    this._estadoVentas$.next(data.estadoVenta);
    this._rifaActual$.next(data.rifaActual);
    this._ganador$.next(data.ganador ? {numero: data.ganador, username: data.ganadorUsername || ''} : null);
  }

  private updateNumeros(data: any): void {
    this._numerosVendidos$.next(data.numerosVendidos);
    this._numerosDisponibles$.next(data.numerosDisponibles);
    this._totalRecaudado$.next(data.totalRecaudado);
  }

  private removeVenta(ventaId: string): void {
    const ventasActuales = this._ventas$.getValue();
    this._ventas$.next(ventasActuales.filter(v => v._id !== ventaId));
  }

  private setGanador(data: any): void {
    this._ganador$.next({
      numero: data.ganador,
      username: data.ganadorUsername
    });
  }

  private handleError(context: string, mensaje: string): void {
    console.error(`Error en ${context}:`, mensaje);
  }

  // Métodos públicos para gestión de sala
  joinRoom(room: string, username: string): void {
    this.username = username;
    this._room$.next(room);
    this.socket.emit('event_join', { room, username });
  }

  leaveRoom(): void {
    const room = this._room$.getValue();
    if (room) {
      this.socket.emit('event_leave', { room, username: this.username });
    }
  }

  // Operaciones de rifa con WebSocket
   iniciarRifa(numeroRifa: number): Observable<any> {
    // CORRECCIÓN: Usar baseUrl y construir la URL correctamente
    return this.http.post(`${this.baseUrl}/${numeroRifa}/iniciar`, {});
  }

   cerrarVentas(numeroRifa: number): Observable<any> {
    // CORRECCIÓN: Usar baseUrl y construir la URL correctamente
    return this.http.put(`${this.baseUrl}/cerrarVentas/${numeroRifa}`, {});
  }

  comprarNumero(numero: number): Observable<{success: boolean, numero: number}> {
    // Esta llamada también necesita ser actualizada si la usas
    return this.createSocketObservable('comprar_numero', { numero }, 'numero_comprado', 'error_compra');
  }

  // MÉTODO CORREGIDO FINAL
  seleccionarGanador(rifaId: number, numeroGanador: number, isAdmin: boolean): Observable<any> {
    // Pasamos los nombres de evento que el backend REALMENTE envía
    return this.createSocketObservable(
      'seleccionar_ganador', 
      { rifaId: rifaId, numeroGanador: numeroGanador, isAdmin: isAdmin }, 
      'sorteo_exitoso', // <-- Evento de éxito CORRECTO
      'error_sorteo'    // <-- Evento de error CORRECTO
    );
  }
  abrirVentas(rifaId: number): Observable<any> {
  return this.http.put(`${this.baseUrl}/abrirVentas/${rifaId}`, {});
}

eliminarRifa(rifaId: number): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}/eliminar/${rifaId}`);
}

  // MÉTODO CORREGIDO: Acepta un cuarto parámetro 'errorEvent'
  private createSocketObservable<T>(event: string, payload: any, successEvent: string, errorEvent: string): Observable<T> {
    const room = this._room$.getValue();
    if (!room) {
      return new Observable(observer => observer.error('No hay sala seleccionada'));
    }

    const fullPayload = { ...payload, room };
    this.socket.emit(event, fullPayload);

    return new Observable(observer => {
      // Limpiamos listeners para evitar fugas de memoria
      this.socket.off(successEvent);
      this.socket.off(errorEvent);

      const successListener = (data: any) => {
        observer.next(data);
        observer.complete();
        this.socket.off(errorEvent, errorListener); // Limpia el otro listener
      };

      const errorListener = (err: any) => {
        observer.error(err);
        // No se completa en error, solo se emite el error.
        this.socket.off(successEvent, successListener); // Limpia el otro listener
      };

      // Usamos .once() para que se disparen una sola vez
      this.socket.once(successEvent, successListener);
      this.socket.once(errorEvent, errorListener);
    });
  }

  // Métodos HTTP adaptados a backend
  obtenerTodasLasRifas(): Observable<Rifa[]> {
    // Usamos baseUrl para las llamadas HTTP
    return this.http.get<Rifa[]>(`${this.baseUrl}/obtenerTodasLasRifas`);
  }

  obtenerRifasPorSala(sala: string): Observable<Rifa[]> {
    return this.http.get<Rifa[]>(`${this.baseUrl}/obtenerRifasBySala/${sala}`);
  }

 crearRifa(rifaData: RifaData): Observable<Rifa> {
  return this.http.post<Rifa>(`${this.baseUrl}/crearRifa`, {
    numeroRifa: rifaData.numeroRifa,  // Corregido "numerousrfa" a "numeroRifa"
    totalNumeros: rifaData.cantidadNumeros,
    precioNumero: rifaData.precioNumero,  // Corregido "precisionNumero" a "precioNumero"
    room: rifaData.sala || 'global'
  });
}

 comprarNumeroHTTP(numeroRifa: string, numero: number, username: string, room: string): Observable<any> {
    const body = {
      rifa: numeroRifa,
      numeros: [numero], // El backend espera un array, aunque sea de un solo elemento
      username: username,
      room: room
    };
    // La ruta correcta es 'comprarNumeros'
    return this.http.post(`${this.baseUrl}/comprarNumeros`, body);
  }

  cerrarVentasHTTP(rifaId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/cerrarVentas/${rifaId}`, {});
  }

  seleccionarGanadorHTTP(rifaId: number, numeroGanador: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/registrarGanador/${rifaId}`, {
      numeroGanador
    });
  }

  getEstadoRifa(): Observable<{estado: boolean, rifaActual: number}> {
    const room = this._room$.getValue();
    return room 
      ? this.http.get<{estado: boolean, rifaActual: number}>(`${this.baseUrl}/estadoRifa/${room}/actual`)
      : new Observable();
  }

  // AÑADE ESTE MÉTODO PÚBLICO
  public setRoom(room: string): void {
    // Este método recibe el nombre de la sala desde el componente
    // y actualiza el BehaviorSubject.
    // Cualquier componente suscrito a room$ recibirá inmediatamente este nuevo valor.
    this._room$.next(room);
  }

  // MÉTODO NUEVO: Para actualizar la lista de rifas desde fuera.
  public actualizarListaRifas(nuevasRifas: any[]): void {
    // CORRECCIÓN: Usar la variable privada _rifas$ para emitir
    this._rifas$.next(nuevasRifas);
  }

  // Método para que los componentes obtengan las rifas
  cargarRifas() {
    // Tu lógica para cargar las rifas iniciales vía HTTP
    // CORRECCIÓN: Asegúrate de usar la URL base completa
    this.http.get<any[]>(`${this.baseUrl}/obtenerTodasLasRifas`).subscribe(rifas => {
      // CORRECCIÓN: Usar la variable privada _rifas$ para emitir
      this._rifas$.next(rifas);
    });
  }
}

interface UserType {
  id: string;
  name: string;
  avatar: string;
  slogan: string;
}

interface NotificacionType {
  tipo: 'info' | 'alerta' | 'error' | 'ganador';
  mensaje: string;
  detalles: {
    rifa?: number;
    numero?: number;
    premio?: number;
    fecha: Date;
  };
}

interface VentaType {
  _id: string;
  username: string;
  numero: number;
  fecha: Date;
  rifa: number;
  sala: string;
}

interface Rifa {
  id: number;
  nombre: string;
  cantidadNumeros: number;
  precioNumero: number;
  estadoVentas: boolean;
  fechaCreacion: Date;
  fechaSorteo?: Date;
  ganador?: string;
  numeroGanador?: number;
  premio?: number;
}

interface RifaData {
  nombre: string;
  cantidadNumeros: number;
  precioNumero: number;
  fechaSorteo?: Date;
  sala?: string; // Puede ser 'global' o un nombre de sala específica
  numeroRifa?: number; // Si se quiere especificar un número de rifa
}