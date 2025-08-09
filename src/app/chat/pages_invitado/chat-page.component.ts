import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { apuestaService } from 'src/app/services/apuestas.service';
import { ChatService } from '../../services/chat.service'; // VERIFICAR ESTA RUTA
import { UsersService } from 'src/app/services/users.service';
import { QuinielaService } from 'src/app/services/quiniela.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // AGREGAR ESTA LÍNEA
import { Subscription } from 'rxjs';
import { take, switchMap, filter } from 'rxjs/operators';
import { MenuComponent } from '../../menu/menu.component';
import { UsersChatComponent } from '../components/users-chat/users-chat.component';
import { UsersRoomsComponent } from '../components/users-rooms/users-rooms.component';
import { VideoPlayerComponent } from 'src/app/reproductor/reproductor.component';
import { UsersTypeComponent } from '../components/users-type/users-type.component';
import { NotificacionPersonalComponent, NotificacionType } from '../components/notificacion-personal/notificacion-personal.component';
import { ChatModalComponent } from '../components/chat-modal/chat-modal.component';
import { RuletaService } from 'src/app/services/ruleta.service'; // Asegúrate de importar el servicio
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

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
    ChatModalComponent
  ],
})
export class ChatInvitadoPageComponent implements OnInit, OnDestroy, AfterViewInit {
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
  private contadorApuestas: number =0;
  private isBotonApostarDisabled: boolean = false;
  private tiempoUltimaApuesta: number = 0;
  private tiempoGraciaInicio: number | null = null;
  private tiempoGraciaRestante: number = 0;
  private intervaloGracia: any = null;
  private bloqueoPorSaldo: boolean = false;
  private readonly TIEMPO_GRACIA_KEY = 'tiempoGraciaData';
  public misNumerosComprados: number[] = [];
  private datosGanador: {numeroGanador: number, ganador: string} | null = null;
  public imagenStreamUrl: string | null = null;

  username: string = localStorage.getItem('nombreUsuario') ?? '';
  userPhoto: string = this.usersService.getImageUrl(this.username);

  balance: number = 0; 
  teamRedScore: number = 8;
  teamGreenScore: number = 5;
   matchNumber: number = 31;
  public mostrarPopupRuleta: boolean = false;
  
  redTeamName: string = '';
  greenTeamName: string = '';
  redPoints: number = 0;
  greenPoints: number = 0;
  
  apuestaSugerida:any;
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
  
  // Propiedades para el botón flotante arrastrable (chat)
  isDragging = false;
  buttonPosition = { x: 20, y: 20 };
  dragOffset = { x: 0, y: 0 };
  dragStartTime = 0;
  dragStartPosition = { x: 0, y: 0 };

  // Propiedades para el botón flotante de la ruleta (independiente)
  ruletaIsDragging = false;
  ruletaButtonPosition = { x: 120, y: 20 };
  ruletaDragOffset = { x: 0, y: 0 };
  ruletaDragStartTime = 0;
  ruletaDragStartPosition = { x: 0, y: 0 };
  // --- RULETA FLOATING BUTTON DRAG LOGIC ---
  onRuletaMouseDown(event: MouseEvent): void {
    this.ruletaIsDragging = true;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.ruletaDragOffset.x = event.clientX - rect.left;
    this.ruletaDragOffset.y = event.clientY - rect.top;
  }

  onRuletaMouseMove(event: MouseEvent): void {
    if (this.ruletaIsDragging) {
      const newX = event.clientX - this.ruletaDragOffset.x;
      const newY = event.clientY - this.ruletaDragOffset.y;
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 60;
      this.ruletaButtonPosition.x = Math.max(0, Math.min(newX, maxX));
      this.ruletaButtonPosition.y = Math.max(0, Math.min(newY, maxY));
    }
  }

  onRuletaMouseUp(): void {
    if (this.ruletaIsDragging) {
      this.ruletaIsDragging = false;
      this.saveRuletaButtonPosition();
    }
  }

  onRuletaTouchStart(event: TouchEvent): void {
    this.ruletaIsDragging = true;
    const touch = event.touches[0];
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.ruletaDragOffset.x = touch.clientX - rect.left;
    this.ruletaDragOffset.y = touch.clientY - rect.top;
  }

  onRuletaTouchMove(event: TouchEvent): void {
    const touch = event.touches[0];
    if (this.ruletaIsDragging) {
      const newX = touch.clientX - this.ruletaDragOffset.x;
      const newY = touch.clientY - this.ruletaDragOffset.y;
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 60;
      this.ruletaButtonPosition.x = Math.max(0, Math.min(newX, maxX));
      this.ruletaButtonPosition.y = Math.max(0, Math.min(newY, maxY));
    }
  }

  onRuletaTouchEnd(): void {
    if (this.ruletaIsDragging) {
      this.ruletaIsDragging = false;
      this.saveRuletaButtonPosition();
    }
  }
  private actualizarMisNumerosComprados(): void {
  this.misNumerosComprados = [];
  for (const [numStr, username] of Object.entries(this.numerosComprados)) {
    const num = Number(numStr);
    if (username === this.username) {
      this.misNumerosComprados.push(num);
    }
  }
  // Ordenar los números
  this.misNumerosComprados.sort((a, b) => a - b);
}

  private loadRuletaButtonPosition(): void {
    const savedPosition = localStorage.getItem('ruletaButtonPosition');
    if (savedPosition) {
      try {
        this.ruletaButtonPosition = JSON.parse(savedPosition);
      } catch (error) {
        console.error('Error loading ruleta button position:', error);
      }
    }
  }

  private saveRuletaButtonPosition(): void {
    localStorage.setItem('ruletaButtonPosition', JSON.stringify(this.ruletaButtonPosition));
  }
  isCasinoPopupOpen = false;
  casinoOptions = ['QUINIELA', 'RULETA', 'RIFA', 'VENTAJA'];
  
  // Propiedades para el modal de rifa
  isRifaModalOpen = false;
  rifas: any[] = [];
  rifaSeleccionada: any = null;
  loadingRifas = false;
  comprandoNumero = false;
  private rifasSubscription: Subscription | undefined;
 

  public numeroRuletaSeleccionado: number | null = null;

  // Ruleta properties
  private ruletaNumbers = [
    {num:1, color:'dorado'},
    {num:2, color:'negro'},
    {num:7, color:'dorado'},
    {num:8, color:'negro'},
    {num:13, color:'dorado'},
    {num:9, color:'negro'},
    {num:10, color:'dorado'},
    {num:5, color:'negro'},
    {num:4, color:'dorado'},
    {num:11, color:'negro'},
    {num:14, color:'dorado'},
    {num:3, color:'negro'},
    {num:6, color:'dorado'},
    {num:12, color:'negro'}
  ];
  private ruletaSpinning = false;
  private ruletaAngle = 0;
  private ruletaAnimationFrame: number | null = null;
  private ruletaCanvas: HTMLCanvasElement | null = null;
  private ruletaCtx: CanvasRenderingContext2D | null = null;

  // --- MÉTODOS DE RULETA ---
  mostrarPopupRuletaHandler(): void {
    this.inicializarRuletaSocket();
    this.mostrarPopupRuleta = true;
    this.cargarPreciosRuleta();
    setTimeout(() => this.drawRuletaWheel(), 300); // Aumenta el tiempo a 300ms
    if (this.ruletaSocket && this.ruletaSocket.connected) {
      this.ruletaSocket.emit('ruleta_obtener_estado', 'global');
    }
  }

  cerrarPopupRuleta(): void {
    this.mostrarPopupRuleta = false;
    this.numeroRuletaSeleccionado = null;
    if (this.ruletaAnimationFrame) {
      cancelAnimationFrame(this.ruletaAnimationFrame);
    }
  }

  girarRuleta(): void {
    // Aquí iría la lógica para hacer girar la ruleta.
    // Basado en el contexto, esta lógica parece faltar.
    // Por ahora, lo dejamos como un placeholder.
    console.log('Girando la ruleta...');
  }

  onSeleccionarNumeroRuleta(numero: number): void {
    this.numeroRuletaSeleccionado = numero;
    console.log(`Número seleccionado: ${numero}`);
  }

  constructor(
    private usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router,
    private apuestaService: apuestaService,
    private chatService: ChatService, // VERIFICAR QUE ESTÉ AQUÍ
    private quinielaService: QuinielaService ,
    private ruletaService: RuletaService,
    private http: HttpClient // AGREGAR ESTA LÍNEA
  ) {
    this.inicializarRuletaSocket();
  }

  public numerosComprados: { [numero: number]: string } = {};
  public ruletaSocket: any;

  // Llama esto en ngOnInit()
  inicializarRuletaSocket() {
  if (this.ruletaSocket && this.ruletaSocket.connected) return;

  if (this.ruletaSocket && !this.ruletaSocket.connected) {
    this.ruletaSocket.disconnect();
    this.ruletaSocket = undefined;
  }

  this.ruletaSocket = io(`${environment.apiUrl_ruleta}:446`, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  this.ruletaSocket.on('connect_error', (err: any) => {
    console.error('Error de conexión al socket de ruleta:', err);
  });

    this.ruletaSocket.emit('join_room', { sala: 'global', usuario: this.username });

    this.ruletaSocket.on('disconnect', () => {
      console.warn('Socket de ruleta desconectado. Intentando reconectar...');
      this.ruletaSocket = undefined;
    });

    this.ruletaSocket.on('ruleta_numeros_actualizados', (data: any) => {
      console.log('Actualización de números:', data);
      this.numerosComprados = {};
      Object.keys(data.comprados).forEach(num => {
        this.numerosComprados[Number(num)] = data.comprados[num].buyer;
      });
      this.actualizarMisNumerosComprados(); // Actualizar la lista del usuario
    });

    this.ruletaSocket.on('ruleta_estado_actual', (estado: any) => {
      this.numerosComprados = {};
      if (estado && estado.comprados) {
        Object.keys(estado.comprados).forEach(num => {
          this.numerosComprados[Number(num)] = estado.comprados[num].buyer;
        });
      }
       this.actualizarMisNumerosComprados();
      console.log('numerosComprados:', this.numerosComprados);
    });

    this.ruletaSocket.on('ruleta_comprar', (respuesta: any) => {
      if (respuesta && respuesta.success) {
        alert('🎉 ¡Número comprado exitosamente!');
        this.actualizarSaldo();
        // El backend ya emite 'ruleta_numeros_actualizados', así que tu UI se actualizará sola
      } else {
        alert('❌ Error al comprar número: ' + (respuesta?.error || 'Error desconocido'));
      }
    });

    this.ruletaSocket.on('ruleta_empezar_giro', (data: { numeroGanador: number, ganador: string }) => {
      console.log('Recibido ruleta_empezar_giro:', data);
      this.datosGanador= data
      this.animarGiroRuleta(data.numeroGanador);
    });

    this.ruletaSocket.on('mensaje_ganador_ruleta', (data: { numeroGanador: number, premio: number }) => {
      this.mensajeGanadorRuleta = `¡Felicidades! Ganaste la ruleta con el número ${data.numeroGanador} y tu premio es $${data.premio.toFixed(2)}.`;
    });

    this.ruletaSocket.on('nueva_ronda_ruleta', (data: { stream: string, sala: string, numeroRonda: number }) => {
      console.log('Nueva ronda recibida:', data);
      this.rondaActualRuleta = data.numeroRonda;
      this.streamActual = data.stream;
      this.salaActual = data.sala;
      this.numerosComprados = {};
      if (this.ruletaSocket && this.ruletaSocket.connected) {
        this.ruletaSocket.emit('ruleta_obtener_estado', { stream: data.stream, sala: data.sala });
      }
    });
  }

  // Método para comprar número
  public comprarNumeroRuleta(num: number) {
  const precio = this.preciosRuleta[num];
  if (!precio) return;
  if (!this.ruletaSocket || !this.ruletaSocket.connected) {
    alert('No hay conexión con la ruleta. Intenta abrir de nuevo el popup o recargar la página.');
    this.inicializarRuletaSocket();
    return;
  }
  // Usa el streamActual y salaActual correctos
  const stream = this.streamActual || 'global';
  const sala = this.salaActual || 'global';

  this.ruletaSocket.emit(
    'ruleta_comprar',
    {
      username: this.username,
      number: num,
      stream: stream,
      sala: sala,
      amount: Number(precio)
    },
    (respuesta: any) => {
      if (respuesta && respuesta.success) {
        alert('🎉 ¡Número comprado exitosamente!');
        this.actualizarSaldo();
      } else {
        alert('❌ Error al comprar número: ' + (respuesta?.error || 'Error desconocido'));
      }
    }
  );
}

  ngOnInit(): void {
    this.cargarEstadoTiempoGracia();
    
    // Cargar posición de los botones flotantes desde localStorage
    this.loadButtonPosition();
    this.loadRuletaButtonPosition();
    
    document.addEventListener('mouseup', () => this.onMouseUp());
    document.addEventListener('touchend', () => this.onTouchEnd());
    // Agregar event listeners globales para el arrastre (ruleta)
    document.addEventListener('mouseup', () => this.onRuletaMouseUp());
    document.addEventListener('touchend', () => this.onRuletaTouchEnd());
    
    this.route.params.subscribe((params: Params) => {
      const variableValue = params['sala'];
      const port = params['port'];
      this.salaActual = variableValue;
      
      // Establece la sala en el servicio de quiniela para que otros componentes la conozcan
      this.quinielaService.setRoom(this.salaActual);

      this.verificarVIP(port);
      this.cargarDatosDeLocalStorage();
      
      this.apuestaService.leaveRoom();
      this.apuestaService.initChat();
      const username: string = localStorage.getItem('nombreUsuario') || '';
      this.apuestaService.joinRoom(variableValue, username);
      
      this.chatService.leaveRoom();
      this.chatService.initChat(); // Asegúrate que esto se llama antes
      this.chatService.joinRoom('global', this.username); // Asegúrate que la sala es 'global'
      
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
    
    this.apuestaService.ganador.subscribe((data:any) => {
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
    document.addEventListener('rifasActualizadas', (event: any) => {
    this.rifas = event.detail.rifas;
    // Mantener la rifa seleccionada si sigue existiendo
    if (this.rifaSeleccionada) {
      this.rifaSeleccionada = this.rifas.find((r: any) => 
        r.numeroRifa === this.rifaSeleccionada.numeroRifa);
    }
  });
  
  this.inicializarRuletaSocket();
  this.cargarPreciosRuleta(); // <--- AGREGA ESTA LÍNEA
  
  // CAMBIAR ESTAS LÍNEAS (quitar eventos Socket.IO):
  // this.chatService.socket.on('stream_image_changed', (payload: { imageUrl: string }) => {
  //   this.imagenStreamUrl = payload.imageUrl;
  //   localStorage.setItem('imagenStreamUrl', payload.imageUrl);
  // });

  // this.chatService.socket.on('stream_image_removed', () => {
  //   this.imagenStreamUrl = null;
  //   localStorage.removeItem('imagenStreamUrl');
  // });

  // POR ESTOS EVENTOS DE POLLING:
  this.chatService.streamImage$.subscribe((payload: { imageUrl: string }) => {
    console.log('[POLLING] Imagen recibida:', payload);
    this.imagenStreamUrl = payload.imageUrl;
    localStorage.setItem('imagenStreamUrl', payload.imageUrl);
  });

  this.chatService.streamImageRemoved$.subscribe(() => {
    console.log('[POLLING] Imagen removida');
    this.imagenStreamUrl = null;
    localStorage.removeItem('imagenStreamUrl');
  });

  // Al iniciar, recupera la imagen si existe
  const savedImage = localStorage.getItem('imagenStreamUrl');
  if (savedImage) {
    this.imagenStreamUrl = savedImage;
  }
  
  // AGREGAR: Polling para imagen overlay
  this.iniciarPollingImagenOverlay();
}

// NUEVO MÉTODO: Polling para imagen overlay
private iniciarPollingImagenOverlay() {
  // Determinar qué stream estamos viendo
  let streamId = '1'; // Por defecto Stream 1
  const currentUrl = window.location.href;
  if (currentUrl.includes('442')) streamId = '2';
  
  // Polling cada 3 segundos para imagen overlay
  setInterval(() => {
    this.http.get<{hasImage: boolean, imageUrl: string}>(`http://localhost:444/api/streams/imagen-overlay/${streamId}`)
      .subscribe({
        next: (data) => {
          if (data.hasImage && data.imageUrl) {
            const nuevaImagenUrl = 'http://localhost:444' + data.imageUrl;
            if (this.imagenStreamUrl !== nuevaImagenUrl) {
              console.log('[POLLING] Nueva imagen overlay detectada:', data.imageUrl);
              this.imagenStreamUrl = nuevaImagenUrl;
              localStorage.setItem('imagenStreamUrl', this.imagenStreamUrl);
            }
          } else {
            if (this.imagenStreamUrl !== null) {
              console.log('[POLLING] Imagen overlay removida');
              this.imagenStreamUrl = null;
              localStorage.removeItem('imagenStreamUrl');
            }
          }
        },
        error: (error) => {
          // Error significa que no hay imagen overlay, lo cual es normal
          if (this.imagenStreamUrl !== null) {
            this.imagenStreamUrl = null;
            localStorage.removeItem('imagenStreamUrl');
          }
        }
      });
  }, 3000); // Cada 3 segundos
}

  ngOnDestroy(): void {
    this.apuestaSubscription?.unsubscribe();
    this.booleanStateSubscription?.unsubscribe();
    this.notificacionSubscription?.unsubscribe();
    this.notificacionGlobalSubscription?.unsubscribe();
    this.rifasSubscription?.unsubscribe();
    
    document.removeEventListener('mouseup', () => this.onMouseUp());
    document.removeEventListener('touchend', () => this.onTouchEnd());
    document.removeEventListener('mouseup', () => this.onRuletaMouseUp());
    document.removeEventListener('touchend', () => this.onRuletaTouchEnd());
    
    // Clean up ruleta observer and animation
    if ((this as any)._ruletaObserver) {
      (this as any)._ruletaObserver.disconnect();
    }
    if (this.ruletaAnimationFrame) cancelAnimationFrame(this.ruletaAnimationFrame);
  }
  
  actualizarSaldo(){
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
    this.router.navigate(['/']);
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

  voy(cantidad:number): void {
    if (this.apuestaSugerida.color === 'rojo'){
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
    if (this.isBotonApostarDisabled){
      return;
    }
   if (this.tiempoUltimaApuesta !== 0){
    if (!confirm("Estás seguro de que quieres volver a apostar?")){
      return;
    }
    this.isBotonApostarDisabled = true;
    setTimeout(()=>{
      this.isBotonApostarDisabled = false;
    }, 6000);
   }
   this.tiempoUltimaApuesta = Date.now();
    
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
        empate:"",
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

  // --- CHAT FLOATING BUTTON DRAG LOGIC (igual que ruleta) ---
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

  async verificarVIP(sala: string) {
    if (await this.esStreamVIP(sala) && !(await this.tieneSaldoSuficiente()) && this.bloqueoPorSaldo){
      alert("No tienes saldo suficiente para acceder a este stream");
      this.router.navigate(['/mi-perfil']);
    }
  }

  async esStreamVIP(claveStream: string): Promise<boolean> {
    try {
      let streamId = '';
      if (claveStream) {
        if (claveStream.includes('440')) streamId = '1';
        else if (claveStream.includes('442')) streamId = '2';
        else if (claveStream.includes('441')) streamId = '3';
      }
      if (!streamId) return false;
      return new Promise((resolve) => {
        this.usersService.getClaveStream(streamId).subscribe(
          (resultado: any) => resolve(resultado.stream.esVIP === true),
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

  abrirCasino() {
    this.isCasinoPopupOpen = true;
  }

  cerrarCasino() {
    this.isCasinoPopupOpen = false;
  }

  // --- MÉTODOS DE QUINIELA ---

  seleccionarOpcion(opcion: string) {
    this.isCasinoPopupOpen = false;
    if (opcion === 'QUINIELA') {
      if (this.verificarSiEsAdmin()) {
        this.router.navigate(['/rifa', this.salaActual]);
      } else {
        this.abrirModalRifa();
      }
    }
  }

  private verificarSiEsAdmin(): boolean {
    const userRole = localStorage.getItem('Rol');
    return userRole === 'superUsuario' || userRole === 'administrador';
  }

  abrirModalRifa() {
    this.isRifaModalOpen = true;
    this.cargarRifasDelStream();
  }

  cerrarModalRifa() {
    this.isRifaModalOpen = false;
    this.rifaSeleccionada = null;
    if (this.rifasSubscription) {
      this.rifasSubscription.unsubscribe();
    }
  }

  // MÉTODO CORREGIDO Y SIMPLIFICADO
  cargarRifasDelStream() {
    this.loadingRifas = true;
    if (this.rifasSubscription) {
      this.rifasSubscription.unsubscribe();
    }
    
    this.rifasSubscription = this.quinielaService.obtenerRifasPorSala('global').subscribe({
      next: (data: any[]) => {
        // SIMPLIFICACIÓN: Ya no necesitamos generar ni calcular nada aquí.
        // El backend ya nos da toda la información que necesitamos.
        this.rifas = data; 
        this.loadingRifas = false;
      },
      error: (error) => {
        this.loadingRifas = false;
        console.error('Error al cargar las quinielas globales:', error);
        this.rifas = [];
      }
    });
  }

  getNumerosVendidos(rifa: any) {
    return Object.entries(rifa.numerosVendidos || {}).map(([numero, username]) => ({
      numero,
      username
    }));
  }

  // MÉTODO 'comprarNumero' MEJORADO Y MÁS SEGURO
  comprarNumero(rifa: any, numero: number) {
    this.comprandoNumero = true;

    // --- VALIDACIONES ---
    if (!rifa || !rifa.numeroRifa) {
      this.comprandoNumero = false;
      alert('Error: No se ha podido seleccionar una quiniela válida.');
      return;
    }
    if (!rifa.estadoVentas) {
      this.comprandoNumero = false;
      alert('⚠️ Las ventas están cerradas para esta quiniela.');
      return;
    }
    if (this.balance < rifa.precioNumero) {
      this.comprandoNumero = false;
      alert(`❌ No tienes saldo suficiente.`);
      return;
    }
    if (!this.username) { // Ya no necesitamos validar salaActual aquí
        this.comprandoNumero = false;
        alert('Error: No se pudo identificar al usuario.');
        return;
    }

    // --- LLAMADA AL SERVICIO ---
    // CORRECCIÓN: El último parámetro ahora es 'global' para coincidir con cómo se cargan las rifas.
    this.quinielaService.comprarNumeroHTTP(rifa.numeroRifa.toString(), numero, this.username, 'global').subscribe({
      next: () => {
        this.comprandoNumero = false;
        this.actualizarSaldo();
        this.cargarRifasDelStream(); // Recargamos los datos para ver el cambio
        setTimeout(() => {
          // Actualizamos la rifa seleccionada en el modal
          const rifaActualizada = this.rifas.find(r => r.numeroRifa === rifa.numeroRifa);
          if (rifaActualizada) {
            this.rifaSeleccionada = rifaActualizada;
          }
        }, 300);
        alert(`🎉 ¡Número ${numero} comprado exitosamente!`);
      },
      error: (err: any) => {
        this.comprandoNumero = false;
        const mensaje = err.error?.error || 'Error desconocido. Verifique la consola.';
        alert(`❌ Error al comprar número: ${mensaje}`);
        console.error("Error detallado de la API:", err);
      }
    });
  }

  seleccionarRifa(rifa: any) {
    this.rifaSeleccionada = rifa;
  }

  volverAListaRifas() {
    this.rifaSeleccionada = null;
  }

  actualizarRifasManualmente() {
    this.cargarRifasDelStream();
  }

  public preciosRuleta: { [numero: number]: number } = {};
  public rondaActualRuleta: number = 0;
  public streamActual: string = '';
  public mensajeGanadorRuleta: string = '';
  public cargarPreciosRuleta() {
    this.ruletaService.getPrices('global').subscribe({
      next: (respuesta: any) => {
        // respuesta puede ser { success: true, data: {1: 100, ...} } o solo {1: 100, ...}
        let precios: any = {};
        if ('data' in respuesta) {
          precios = respuesta.data || {};
        } else {
          precios = respuesta || {};
        }
        console.log('Precios procesados:', precios);
        this.preciosRuleta = {};
        for (const key in precios) {
          if (precios.hasOwnProperty(key)) {
            this.preciosRuleta[Number(key)] = Number(precios[key]);
          }
        }
      },
      error: (err) => {
        console.error('Error cargando precios de ruleta:', err);
        this.preciosRuleta = {};
      }
    });
  }

  animarGiroRuleta(numeroGanador: number) {
    const index = this.ruletaNumbers.findIndex(n => n.num === numeroGanador);
    if (index !== -1) {
      this.spinRuletaToIndex(index);
    }
  }

  spinRuletaToIndex(targetIndex: number) {
    if (this.ruletaSpinning) return;
    this.ruletaSpinning = true;
    const n = this.ruletaNumbers.length;
    const anglePerSector = 2 * Math.PI / n;
    const targetAngle = (2 * Math.PI * 20) + (2 * Math.PI - (targetIndex + 0.5) * anglePerSector);
    const duration = 20000;
    const start = performance.now();
    const initialAngle = this.ruletaAngle;

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      this.ruletaAngle = initialAngle + (targetAngle - initialAngle) * ease;
      this.drawRuletaWheel();
      if (t < 1) {
        this.ruletaAnimationFrame = requestAnimationFrame(animate);
      } else {
        this.ruletaSpinning = false;
        this.ruletaAngle = this.ruletaAngle % (2 * Math.PI);
        this.drawRuletaWheel(targetIndex);
        this.numeroRuletaSeleccionado = this.ruletaNumbers[targetIndex].num;
      }
        // MOSTRAR NOTIFICACIÓN SOLO CUANDO TERMINA EL GIRO
      if (this.datosGanador && this.datosGanador.ganador === this.username) {
        this.mostrarNotificacionGanador(this.datosGanador.numeroGanador);
      }
      this.datosGanador = null; // Limpiar datos
    };
    
    if (this.ruletaAnimationFrame) cancelAnimationFrame(this.ruletaAnimationFrame);
    this.ruletaAnimationFrame = requestAnimationFrame(animate);
  }
  private mostrarNotificacionGanador(numeroGanador: number): void {
  // Calcular monto neto (total apostado menos 28.57%)
  const montoApostado = this.misNumerosComprados.reduce((total, num) => {
    return total + (this.preciosRuleta[num] || 0);
  }, 0);
  
  const montoNeto = montoApostado * (1 - 0.2857); // Restar 28.57%
  
 type NotificacionApuesta = {
  tipo: 'apuesta' | 'cazada';
  mensaje: string;
  detalles: {
    cantidad: number;
    cantidadOriginal?: number;
    cantidadDevuelta?: number;
    cantidadCazada?: number;
    ronda: number;
    sala: string;
    fecha: Date;
    // Propiedades específicas de apuestas
    color?: 'rojo' | 'verde';
    estado?: 'en_espera' | 'cazada';
  };
};
type NotificacionRuleta = {
  tipo: 'ganancia_ruleta';
  mensaje: string;
  detalles: {
    cantidad: number;
    ronda: number;
    sala: string;
    fecha: Date;
    // Propiedades específicas de ruleta
    numeroGanador: number;
    montoApostado: number;
    multiplicador: number;
  };
};
  type NotificacionType = NotificacionApuesta | NotificacionRuleta;
}

  drawRuletaWheel(selectedIndex?: number) {
    if (!this.ruletaCanvas) {
      this.ruletaCanvas = document.getElementById('ruleta-canvas') as HTMLCanvasElement;
      if (!this.ruletaCanvas) return;
      this.ruletaCtx = this.ruletaCanvas.getContext('2d');
    }
    if (!this.ruletaCtx) return;

    const ctx = this.ruletaCtx;
    const width = this.ruletaCanvas.width;
    const height = this.ruletaCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    const n = this.ruletaNumbers.length;
    const anglePerSector = 2 * Math.PI / n;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < n; i++) {
      const angleStart = this.ruletaAngle + i * anglePerSector;
      const angleEnd = angleStart + anglePerSector;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angleStart, angleEnd);
      ctx.closePath();
      ctx.fillStyle = this.ruletaNumbers[i].color === 'dorado' ? '#FFD700' : '#222';
      ctx.globalAlpha = (selectedIndex === i) ? 0.7 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      // Número
      ctx.save();
      ctx.translate(centerX, centerY);
          const angle = angleStart + anglePerSector / 2; // Centro del sector
      ctx.rotate(this.ruletaAngle + i * anglePerSector + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textRadius = radius * 0.6; // Ajusta este valor según necesites
ctx.fillText(this.ruletaNumbers[i].num.toString(), 18, -textRadius);
      ctx.restore();
    }

    // Flecha
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(radius + 10, 0);
    ctx.lineTo(radius + 30, -10);
    ctx.lineTo(radius + 30, 10);
    ctx.closePath();
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    ctx.restore();
  }

  ngAfterViewInit(): void {
    // Si necesitas lógica aquí, agrégala. Si no, déjalo vacío.
  }
  
} // <--- Aquí termina la clase

interface UserType {
  name: string;
  avatar: string;
  slogan: string;
  id: string;
}