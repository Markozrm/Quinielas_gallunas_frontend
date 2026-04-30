import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { apuestaService } from 'src/app/services/apuestas.service';
import { ChatService } from '../services/chat.service';
import { UsersService } from 'src/app/services/users.service';
import { QuinielaService } from 'src/app/services/quiniela.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription, firstValueFrom } from 'rxjs';
import { take, switchMap, filter } from 'rxjs/operators';
import { MenuComponent } from '../../menu/menu.component';
import { UsersChatComponent } from '../components/users-chat/users-chat.component';
import { UsersRoomsComponent } from '../components/users-rooms/users-rooms.component';
import { VideoPlayerComponent } from 'src/app/reproductor/reproductor.component';
import { UsersTypeComponent } from '../components/users-type/users-type.component';
import { NotificacionPersonalComponent, NotificacionType } from '../components/notificacion-personal/notificacion-personal.component';
import { ChatModalComponent } from '../components/chat-modal/chat-modal.component';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { TablaPuntosComponent } from 'src/app/tabla-puntos/tabla-puntos.component';
@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.css'],
  standalone: true,
  imports: [
    UsersRoomsComponent,
    CommonModule,
    FormsModule,
    UsersChatComponent,
    MenuComponent,
    VideoPlayerComponent,
    UsersTypeComponent,
    NotificacionPersonalComponent,
    ChatModalComponent,
    TablaPuntosComponent
  ],
})
export class ChatInvitadoPageComponent implements OnInit, OnDestroy {
  formatMessageDate(dateInput: Date | string): string {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Fecha desconocida';
    }
  }

  formatDate(dateInput: Date | string, includeTime: boolean = true): string {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '--/--/----';
      }
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...(includeTime && {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      };
      return new Intl.DateTimeFormat('es-ES', options).format(date);
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return '--/--/----';
    }
  }

  public estadoActualApuesta = '';
  public rondaActual = 0;
  public cantidadApostadaRojo = 0;
  public cantidadApostadaVerde = 0;
  public textButton = 'desactivar scroll';
  public chat$ = this.apuestaService.chat$;
  public scrollable = true;
  public connectedUsers: any;
  public isPopupOpen = false;
  public users: any[] = [];
  public selectedTeam: 'rojo' | 'verde' | null = null;
  public apuesta: { rojo: string; verde: string } = { rojo: '', verde: '' };
  private chatSubscription: Subscription | undefined;
  private apuestaSubscription: Subscription | undefined;
  private booleanStateSubscription: Subscription | undefined;
  private notificacionSubscription: Subscription | undefined;
  private contadorApuestas: number = 0;
  private isBotonApostarDisabled: boolean = false;
  private tiempoUltimaApuesta: number = 0;
  private tiempoGraciaInicio: number | null = null;
  private tiempoGraciaRestante: number = 0;
  private intervaloGracia: any = null;
  private bloqueoPorSaldo: boolean = false;
  private readonly TIEMPO_GRACIA_KEY = 'tiempoGraciaData';
  private readonly COOLDOWN_APUESTA = 6000;
  private readonly LAST_BET_KEY = 'ultimaApuestaTimestamp';
  public misNumerosComprados: number[] = [];
  private datosGanador: { numeroGanador: number, ganador: string } | null = null;
  public imagenStreamUrl: string | null = null;

  username: string = localStorage.getItem('nombreUsuario') ?? '';
  userPhoto: string = this.usersService.getImageUrl(this.username);

  balance: number = 0;
  teamRedScore: number = 8;
  teamGreenScore: number = 5;
  matchNumber: number = 31;

  redTeamName: string = '';
  greenTeamName: string = '';
  redPoints: number = 0;
  greenPoints: number = 0;

  apuestaSugerida: any;
  isApuestasAbiertas: boolean = true;
  quickBetAmounts: number[] = [100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000, 20000];
  betAmount: number = 0;
  isApuestaAbierta: boolean = false;

  notificacionActual: NotificacionType | null = null;
  historialNotificaciones: NotificacionType[] = [];
  mostrarHistorialNotificaciones: boolean = false;

  montoTotalEnEspera: number = 0;
  montoTotalCazado: number = 0;
  montoRojoCazado: number = 0;
  montoVerdeCazado: number = 0;
  colorApuestasCazadas: string = '';
  private salaActual: string = '';

  notificacionGlobal: NotificacionType | null = null;
  private notificacionGlobalSubscription: Subscription | undefined;

  isChatModalOpen = false;

  isDragging = false;
  buttonPosition = { x: 20, y: 20 };
  dragOffset = { x: 0, y: 0 };
  dragStartTime = 0;
  dragStartPosition = { x: 0, y: 0 };
  isCasinoPopupOpen = false;
  casinoOptions = ['QUINIELA', 'RULETA', 'RIFA', 'VENTAJA'];

  constructor(
    private usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router,
    private apuestaService: apuestaService,
    private chatService: ChatService,
    private quinielaService: QuinielaService,
    private http: HttpClient
  ) {
  }

  public numerosComprados: { [numero: number]: string } = {};

  ngOnInit(): void {
    this.restaurarBloqueoApuesta();
    this.cargarEstadoTiempoGracia();
    this.loadButtonPosition();
    document.addEventListener('mouseup', () => this.onMouseUp());
    document.addEventListener('touchend', () => this.onTouchEnd());

    this.route.params.subscribe(async (params: Params) => {
      const variableValue = params['sala'];
      const port = params['port'];
      this.salaActual = variableValue;

      this.quinielaService.setRoom(this.salaActual);

      // ✅ Se llama con variableValue (sala) en lugar de port
      this.verificarVIP(variableValue);
      this.cargarDatosDeLocalStorage();

      this.apuestaService.leaveRoom();
      this.apuestaService.initChat();
      const username: string = localStorage.getItem('nombreUsuario') || '';
      this.apuestaService.joinRoom(variableValue, username);

      let roomClave = '';

      const formatoFechaRegex = /(Stream\d+)-(\d{2}-\d{2}-\d{4})/;
      const matchFecha = variableValue.match(formatoFechaRegex);

      if (matchFecha) {
        roomClave = variableValue;
        console.log(`[ChatInvitado] URL con fecha detectada. Usando sala histórica: ${roomClave}`);
      } else {
        let streamId = variableValue;
        const matchId = variableValue.match(/Stream(\d+)|(^(\d+)$)/i);
        if (matchId) {
          streamId = matchId[1] || matchId[3] || variableValue;
        }

        const targetDate = new Date();
        const dia = targetDate.getDate().toString().padStart(2, '0');
        const mes = (targetDate.getMonth() + 1).toString().padStart(2, '0');
        const año = targetDate.getFullYear();
        const fechaFormateada = `${dia}-${mes}-${año}`;

        roomClave = `Stream${streamId}-${fechaFormateada}`;
        console.log(`[ChatInvitado] URL genérica. Generando sala para HOY: ${roomClave}`);
      }

      this.chatService.leaveRoom();
      this.chatService.initChat();
      this.chatService.joinRoom(roomClave, this.username);
      this.chatService.emitirGetMensajesHistorial(roomClave);

      this.apuestaService.getCantidades().subscribe((data: any) => {
        console.log('Cantidades actualizadas:', data);
      });
    });

    this.apuestaSubscription = this.apuestaService.chat$.subscribe((messages: any[]) => {
      this.actualizarSaldo();
      this.calcularMontosUsuario(messages);
    });

    this.apuestaService.estadoApuesta.subscribe((valor: any) => {
      this.actualizarSaldo();
      this.isApuestaAbierta = valor as boolean;
      this.estadoActualApuesta = valor ? 'APUESTAS ABIERTAS' : 'APUESTAS CERRADAS';
      if (!valor) {
        this.guardarDatosEnLocalStorage();
      }
    });

    this.apuestaService.rondaActual.subscribe((ronda: number) => {
      this.rondaActual = ronda;
      //this.yaApostoEstaRonda = this.consultarApuestaRondaActual();
      if (ronda !== 0) {
        this.guardarDatosEnLocalStorage();
      }
    });

    this.apuestaService.cantidadApuestasRojo.subscribe((cantidad: number) => {
      this.cantidadApostadaRojo = cantidad;
      this.actualizarSaldo();
    });

    this.apuestaService.cantidadApuestasVerde.subscribe((cantidad: number) => {
      this.cantidadApostadaVerde = cantidad;
      this.guardarDatosEnLocalStorage();
    });

    this.apuestaService.apuestaSugerida.subscribe((data) => {
      this.apuestaSugerida = data;
    });

    this.apuestaService.getEstadoApuesta().subscribe((data: any) => {
      this.isApuestaAbierta = data.estadoApuesta;
      if (typeof data.rondaActual === 'number') {
        this.rondaActual = data.rondaActual;
      }
      if (data.teamInfo) {
        this.redTeamName = data.teamInfo.redTeamName;
        this.greenTeamName = data.teamInfo.greenTeamName;
        this.redPoints = data.teamInfo.redPoints;
        this.greenPoints = data.teamInfo.greenPoints;
      }
    });

    this.usersService.getSaldo(this.username).subscribe((data: any) => {
      this.balance = data.saldo;
    });

    this.apuestaService.ganador.subscribe((data: any) => {
      this.actualizarSaldo();
    });

    this.notificacionSubscription = this.apuestaService.notificacionPersonal.subscribe((notificacion) => {
      if (notificacion) {
        this.mostrarNotificacion(notificacion);
      }
    });

    this.notificacionGlobalSubscription = this.apuestaService.notificacionGlobal.subscribe((notificacion) => {
      if (notificacion) {
        this.mostrarNotificacionGlobal(notificacion);
      }
    });

    this.apuestaService.getSaldoActualizado().subscribe((nuevoSaldo: number) => {
      this.balance = nuevoSaldo;
    });

    const savedImage = localStorage.getItem('imagenStreamUrl');
    if (savedImage) {
      this.imagenStreamUrl = savedImage;
    }
    this.apuestaService.getUsersCount().subscribe((count: any) => {
      this.connectedUsers = count;
    });
    this.getStreamTitle();
  }

  getStreamTitle() {
    this.http.get<any>(`${environment.apiUrl}/api/settings/title`).subscribe({
      next: (res) => {
        if (res && res.title) {
          this.streamTitle = res.title;
        }
      },
      error: (err) => console.error('Error fetching stream title:', err)
    });
  }

  streamTitle: string = 'QUINIELAS GALLISTICAS';

  actualizarSaldo() {
    this.usersService.getSaldo(this.username).subscribe((data: any) => {
      this.balance = data.saldo;
      if (this.balance === 0 && !this.tiempoGraciaInicio && !this.bloqueoPorSaldo) {
        this.iniciarTiempoGracia();
      } else if (this.balance > 0 && this.tiempoGraciaInicio) {
        this.limpiarTiempoGracia();
      }
      this.guardarDatosEnLocalStorage();
    });
  }

  selectTeam(team: 'rojo' | 'verde'): void {
    this.apuesta = team === 'rojo' ? { rojo: 'rojo', verde: '' } : { rojo: '', verde: 'verde' };
    this.selectedTeam = team;
  }

  logout(): void {
    this.reiniciarValoresApuestas();
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`apuestas_${this.username}`)) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem('tokenLogin');
    localStorage.removeItem('nombreUsuario');
    this.router.navigate(['/']);
  }

  inicio(): void {
    this.router.navigate(['/Inicio']);
  }

  esAdmin(): boolean {
    const rol = localStorage.getItem('Rol') || '';
    return rol === 'superUsuario' || rol === 'administrador';
  }

  esInvitado(): boolean {
    const rol = localStorage.getItem('Rol') || '';
    return rol === 'invitado';
  }

  openPopup(): void {
    if (this.esAdmin()) {
      this.isPopupOpen = true;
    }
  }

  irRecargar(): void {
    this.router.navigate(['/recargar']);
  }

  irMiPerfil(): void {
    this.router.navigate(['/mi-perfil']);
  }

  closePopup(): void {
    this.isPopupOpen = false;
  }

  getUserPhoto(username: string): string {
    return this.usersService.getImageUrl(username);
  }

  voy(cantidad: number): void {
    if (this.apuestaSugerida.color === 'rojo') {
      this.apuesta.rojo = 'rojo'
      this.apuesta.verde = ''
    }
    else {
      this.apuesta.rojo = ''
      this.apuesta.verde = 'verde'
    }
    const cantidadString = String(cantidad);
    this.apostar(cantidadString);
  }

  apostar(cantidad: string): void {
    const cantidadNumerica = Number(cantidad);
    if (isNaN(cantidadNumerica) || !Number.isInteger(cantidadNumerica)) {
      alert("Solo se permiten apuestas con números enteros.");
      return;
    }
    if (!this.isApuestaAbierta) {
      alert('Las apuestas actualmente están cerradas');
      return;
    }
    if (this.apuesta.rojo == '' && this.apuesta.verde == '') {
      alert("Por favor seleccione el color de la apuesta (rojo o verde)");
      return;
    }
    if (cantidadNumerica < 10) {
      alert("La cantidad debe ser de 10 en adelante");
      return;
    }
    if (this.isBotonApostarDisabled) {
      return;
    }
    if (this.tiempoUltimaApuesta !== 0) {
      if (!confirm("Estás seguro de que quieres volver a apostar?")) {
        return;
      }
    }
    this.tiempoUltimaApuesta = Date.now();
    localStorage.setItem(this.LAST_BET_KEY, this.tiempoUltimaApuesta.toString());

    this.isBotonApostarDisabled = true;
    setTimeout(() => {
      this.isBotonApostarDisabled = false;
      localStorage.removeItem(this.LAST_BET_KEY);
    }, this.COOLDOWN_APUESTA);

    this.usersService.getSaldo(this.username).subscribe((data: any) => {
      const saldoActual = data.saldo;
      if (saldoActual < cantidadNumerica) {
        alert("El saldo es insuficiente para realizar la apuesta");
        return;
      }

      const room = this.route.snapshot.paramMap.get('id');
      this.apuestaService.sendMessage({
        username: this.username,
        rojo: this.apuesta.rojo,
        verde: this.apuesta.verde,
        empate: "",
        cantidad: cantidadNumerica,
        room: room || '',
      });

      this.montoTotalEnEspera += cantidadNumerica;
      this.guardarDatosEnLocalStorage();

      const notificacion: NotificacionType = {
        tipo: 'informacion',
        mensaje: `Has apostado $${cantidadNumerica} al equipo ${this.apuesta.rojo ? 'ROJO' : 'VERDE'}`,
        detalles: {
          cantidad: cantidadNumerica,
          ronda: this.rondaActual,
          sala: room || 'sala1',
          fecha: new Date()
        }
      };
      this.mostrarNotificacion(notificacion);

      //this.marcarApuestaRondaActual();
      //this.yaApostoEstaRonda = true;
    });
  }

  apostarAllIn(): void {
    if (this.balance > 0) {
      this.apostar(this.balance.toString());
    }
  }

  esVerde(verde: any): boolean {
    return verde.nombre === 'verde';
  }

  setBetAmount(amount: number | null) {
    this.betAmount = amount || 0;
  }

  apostarWithAmount() {
    this.apostar(this.betAmount.toString());
  }

  mostrarNotificacion(notificacion: NotificacionType): void {
    this.historialNotificaciones.unshift(notificacion);
    if (this.historialNotificaciones.length > 10) {
      this.historialNotificaciones = this.historialNotificaciones.slice(0, 10);
    }
    this.notificacionActual = { ...notificacion };
    if (notificacion.tipo === 'Apuesta cazada parcialmente') {
      this.actualizarSaldo();
      this.apuestaService.chat$.pipe(take(1)).subscribe(messages => {
        this.calcularMontosUsuario(messages);
      });
    }
  }

  mostrarNotificacionGlobal(notificacion: NotificacionType): void {
    this.historialNotificaciones.unshift(notificacion);
    if (this.historialNotificaciones.length > 10) {
      this.historialNotificaciones = this.historialNotificaciones.slice(0, 10);
    }
    this.notificacionActual = notificacion;
    this.actualizarSaldo();
    this.reiniciarValoresApuestas();
  }

  cerrarNotificacion(): void {
    this.notificacionActual = null;
  }

  toggleHistorialNotificaciones(): void {
    this.mostrarHistorialNotificaciones = !this.mostrarHistorialNotificaciones;
  }

  openChatModal(): void {
    if (!this.isDragging) {
      this.isChatModalOpen = true;
    }
  }

  closeChatModal(): void {
    this.isChatModalOpen = false;
  }

  onMouseDown(event: MouseEvent): void {
    this.isDragging = false;
    this.dragStartTime = Date.now();
    this.dragStartPosition = { x: event.clientX, y: event.clientY };
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.dragOffset.x = event.clientX - rect.left;
    this.dragOffset.y = event.clientY - rect.top;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) {
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
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 60;
      this.buttonPosition.x = Math.max(0, Math.min(newX, maxX));
      this.buttonPosition.y = Math.max(0, Math.min(newY, maxY));
    }
  }

  onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.saveButtonPosition();
    }
  }

  onTouchStart(event: TouchEvent): void {
    this.isDragging = false;
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
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 60;
      this.buttonPosition.x = Math.max(0, Math.min(newX, maxX));
      this.buttonPosition.y = Math.max(0, Math.min(newY, maxY));
    }
  }

  onTouchEnd(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.saveButtonPosition();
    }
  }

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

  calcularMontosUsuario(apuestas: any[]): void {
    let montoEnEspera = 0;
    let montoRojoCazado = 0;
    let montoVerdeCazado = 0;
    const apuestasUsuario = apuestas.filter(apuesta => apuesta.user.name === this.username);
    apuestasUsuario.forEach(apuesta => {
      if (apuesta.estado === 'en_espera') {
        montoEnEspera += apuesta.cantidad;
      } else if (apuesta.estado === 'cazada') {
        if (apuesta.rojo === 'rojo') {
          montoRojoCazado += apuesta.cantidad;
        } else if (apuesta.verde === 'verde') {
          montoVerdeCazado += apuesta.cantidad;
        }
      }
    });
    this.montoTotalEnEspera = montoEnEspera;
    this.montoTotalCazado = montoRojoCazado + montoVerdeCazado;
    this.montoRojoCazado = montoRojoCazado;
    this.montoVerdeCazado = montoVerdeCazado;
    if (montoRojoCazado > 0 && montoVerdeCazado > 0) {
      this.colorApuestasCazadas = 'ambos';
    } else if (montoRojoCazado > 0) {
      this.colorApuestasCazadas = 'rojo';
    } else if (montoVerdeCazado > 0) {
      this.colorApuestasCazadas = 'verde';
    } else {
      this.colorApuestasCazadas = '';
    }
    this.guardarDatosEnLocalStorage();
  }

  guardarDatosEnLocalStorage(): void {
    const datosApuestas = {
      sala: this.salaActual,
      ronda: this.rondaActual,
      montoTotalEnEspera: this.montoTotalEnEspera,
      montoTotalCazado: this.montoTotalCazado,
      montoRojoCazado: this.montoRojoCazado,
      montoVerdeCazado: this.montoVerdeCazado,
      colorApuestasCazadas: this.colorApuestasCazadas
    };
    localStorage.setItem(`apuestas_${this.username}_${this.salaActual}`, JSON.stringify(datosApuestas));
  }

  cargarDatosDeLocalStorage(): void {
    try {
      const datosGuardados = localStorage.getItem(`apuestas_${this.username}_${this.salaActual}`);
      if (datosGuardados) {
        const datos = JSON.parse(datosGuardados);
        if (datos.sala === this.salaActual) {
          this.montoTotalEnEspera = datos.montoTotalEnEspera || 0;
          this.montoTotalCazado = datos.montoTotalCazado || 0;
          this.montoRojoCazado = datos.montoRojoCazado || 0;
          this.montoVerdeCazado = datos.montoVerdeCazado || 0;
          this.colorApuestasCazadas = datos.colorApuestasCazadas || '';
        } else {
          this.reiniciarValoresApuestas();
        }
      } else {
        this.reiniciarValoresApuestas();
      }
    } catch (error) {
      console.error('Error al cargar datos de localStorage:', error);
      this.reiniciarValoresApuestas();
    }
  }

  reiniciarValoresApuestas(): void {
    this.montoTotalEnEspera = 0;
    this.montoTotalCazado = 0;
    this.montoRojoCazado = 0;
    this.montoVerdeCazado = 0;
    this.colorApuestasCazadas = '';
    localStorage.removeItem(`apuestas_${this.username}_${this.salaActual}`);
  }

  // ✅ CORREGIDO: eliminada la condición bloqueoPorSaldo que impedía funcionar
  async verificarVIP(sala: string) {
    const esVIP = await this.esStreamVIP(sala);
    if (esVIP) {
      const tieneSaldo = await this.tieneSaldoSuficiente();
      if (!tieneSaldo) {
        alert("No tienes saldo suficiente para acceder a este stream VIP");
        this.router.navigate(['/mi-perfil']);
      }
    }
  }

  // ✅ CORREGIDO: detecta el stream por el parámetro 'sala' (ej: "Stream1", "Stream1-08-04-2026", "1")
  async esStreamVIP(claveStream: string): Promise<boolean> {
    try {
      let streamId = '';
      if (claveStream) {
        // Detectar por formato "Stream1", "Stream2", etc. o número directo
        const match = claveStream.match(/Stream(\d+)/i) || claveStream.match(/^(\d+)$/);
        if (match) {
          streamId = match[1];
        }
      }
      if (!streamId) return false;

      return new Promise((resolve) => {
        this.usersService.getClaveStream(streamId).subscribe(
          (resultado: any) => resolve(resultado?.stream?.esVIP === true),
          (error: any) => {
            console.error('Error al verificar si es stream VIP:', error);
            resolve(false);
          }
        );
      });
    } catch (error) {
      console.error('Error en esStreamVIP:', error);
      return false;
    }
  }

  async tieneSaldoSuficiente(): Promise<boolean> {
    const username = localStorage.getItem('nombreUsuario') || '';
    return new Promise((resolve) => {
      this.usersService.getSaldo(username).subscribe(
        (saldoObj: any) => resolve(Number(saldoObj.saldo) >= 1),
        (error: any) => {
          console.error('Error al obtener el saldo:', error);
          resolve(false);
        }
      );
    });
  }

  private restaurarBloqueoApuesta(): void {
    const lastBet = localStorage.getItem(this.LAST_BET_KEY);
    if (!lastBet) return;

    const lastBetTime = Number(lastBet);
    const elapsed = Date.now() - lastBetTime;
    const remaining = this.COOLDOWN_APUESTA - elapsed;

    if (remaining > 0) {
      this.isBotonApostarDisabled = true;
      setTimeout(() => {
        this.isBotonApostarDisabled = false;
        localStorage.removeItem(this.LAST_BET_KEY);
      }, remaining);
    } else {
      localStorage.removeItem(this.LAST_BET_KEY);
    }
  }

  private iniciarTiempoGracia(): void {
    if (this.tiempoGraciaInicio) return;
    this.tiempoGraciaInicio = Date.now();
    this.tiempoGraciaRestante = 5 * 60 * 60 * 1000;
    this.guardarEstadoTiempoGracia();
    this.intervaloGracia = setInterval(() => this.verificarTiempoGracia(), 60000);
  }

  private verificarTiempoGracia(): void {
    if (!this.tiempoGraciaInicio) return;
    const tiempoTranscurrido = Date.now() - this.tiempoGraciaInicio;
    this.tiempoGraciaRestante = Math.max(0, 5 * 60 * 60 * 1000 - tiempoTranscurrido);
    if (this.tiempoGraciaRestante <= 0) {
      this.finalizarTiempoGracia();
    }
  }

  private finalizarTiempoGracia(): void {
    clearInterval(this.intervaloGracia);
    this.bloqueoPorSaldo = true;
    this.guardarEstadoTiempoGracia();
    this.mostrarNotificacion({
      tipo: 'error',
      mensaje: 'Tu tiempo ha terminado, es necesario recargar saldo para seguir viendo este stream',
      detalles: { cantidad: 0, ronda: this.rondaActual, sala: this.salaActual, fecha: new Date() }
    });
  }

  private cargarEstadoTiempoGracia(): void {
    const datosGuardados = localStorage.getItem(this.TIEMPO_GRACIA_KEY);
    if (datosGuardados) {
      const { inicio, bloqueo } = JSON.parse(datosGuardados);
      this.tiempoGraciaInicio = inicio;
      this.bloqueoPorSaldo = bloqueo;
      if (inicio && !bloqueo) {
        const tiempoTranscurrido = Date.now() - inicio;
        if (tiempoTranscurrido < 5 * 60 * 60 * 1000) {
          this.tiempoGraciaRestante = 5 * 60 * 60 * 1000 - tiempoTranscurrido;
          this.iniciarTiempoGracia();
        } else {
          this.bloqueoPorSaldo = true;
        }
      }
    }
  }

  private guardarEstadoTiempoGracia(): void {
    localStorage.setItem(this.TIEMPO_GRACIA_KEY, JSON.stringify({
      inicio: this.tiempoGraciaInicio,
      bloqueo: this.bloqueoPorSaldo
    }));
  }

  private limpiarTiempoGracia(): void {
    clearInterval(this.intervaloGracia);
    this.tiempoGraciaInicio = null;
    this.bloqueoPorSaldo = false;
    localStorage.removeItem(this.TIEMPO_GRACIA_KEY);
  }

  seleccionarOpcion(opcion: string) {
    this.isCasinoPopupOpen = false;
    if (opcion === 'QUINIELA') {
      if (this.verificarSiEsAdmin()) {
        this.router.navigate(['/rifa', this.salaActual]);
      } else {
        // Modal de rifa eliminado
      }
    }
  }

  private verificarSiEsAdmin(): boolean {
    const userRole = localStorage.getItem('Rol');
    return userRole === 'superUsuario' || userRole === 'administrador';
  }

  private getApuestaRondaKey(): string {
    return `apuesta_realizada_${this.username}_${this.salaActual}_ronda_${this.rondaActual}`;
  }

  private marcarApuestaRondaActual(): void {
    localStorage.setItem(this.getApuestaRondaKey(), 'true');
  }

  private consultarApuestaRondaActual(): boolean {
    return localStorage.getItem(this.getApuestaRondaKey()) === 'true';
  }

  async volver(): Promise<void> {
    const rol = localStorage.getItem('Rol');
    const puerto = '443';
    console.log('VOLVER DEBUG -> Rol localStorage:', rol);

    try {
      console.log('Solicitando clave más reciente al backend...');
      const res: any = await firstValueFrom(this.usersService.getClaveStream('1'));
      const nuevaClave = res?.stream?.clave;
      console.log('Respuesta getClaveStream:', res);

      if (!nuevaClave) {
        alert('No se encontró la clave del stream activo.');
        return;
      }

      localStorage.setItem('streamClave', nuevaClave);
      console.log('streamClave actualizada en localStorage:', nuevaClave);

      const target = (rol === 'superUsuario' || rol === 'administrador')
        ? `/live-admin/${nuevaClave}/${puerto}`
        : `/live-inv/${nuevaClave}/${puerto}`;

      console.log('Navegando a target:', target);
      if (window.location.pathname === target) {
        console.log('Ya estamos en la página correcta. Forzando recarga...');
        window.location.reload();
      } else {
        await this.router.navigateByUrl(target);
      }
    } catch (err: any) {
      console.error('Error obteniendo clave del stream:', err);
      alert('No se pudo obtener la clave del stream. Intenta más tarde.');
    }
  }

  public montoDisponible: number = 0;
  public disponibleColor: 'rojo' | 'verde' | null = null;
  public yaApostoEstaRonda: boolean = false;

  actualizarMontoDisponible() {
    const rojo = this.cantidadApostadaRojo;
    const verde = this.cantidadApostadaVerde;

    if (rojo > verde) {
      this.montoDisponible = rojo - verde;
      this.disponibleColor = 'rojo';
    } else if (verde > rojo) {
      this.montoDisponible = verde - rojo;
      this.disponibleColor = 'verde';
    } else {
      this.montoDisponible = 0;
      this.disponibleColor = null;
    }
  }

  ngOnDestroy(): void {
  }
}

interface UserType {
  name: string;
  avatar: string;
  slogan: string;
  id: string;
}