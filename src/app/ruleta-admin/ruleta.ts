import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, AfterViewChecked } from '@angular/core';
import { RuletaService } from '../services/ruleta.service';
import { ActivatedRoute } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-ruleta',
  templateUrl: './ruleta.component.html',
  styleUrls: ['./ruleta.component.css']
})
export class RuletaComponent implements OnInit, AfterViewInit, AfterViewChecked {
  precios: {[key: number]: number} = {};
  numeroSeleccionado: number = 1;
  nuevoPrecio: string = '';
  salaActual: string = 'global';
  public mostrarRuleta: boolean = false;
  public mostrarPopupRuleta: boolean = false;
  
  // NUEVA PROPIEDAD PARA EL TÍTULO
  tituloRuleta: string = '';
  
  parseFloat = parseFloat; 
  isNaN = isNaN;

  @ViewChild('ruletaCanvas', { static: false }) ruletaCanvas!: ElementRef<HTMLCanvasElement>;
  private ruletaCtx: CanvasRenderingContext2D | null = null;
  private ruletaAnimationFrame: number | null = null;
  private ruletaAngle = 0;
  private ruletaSpinning = false;
  public numeroRuletaSeleccionado: number | null = null;

  // Sectores y colores personalizados
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

  private ruletaPopupWasVisible = false;

  numerosCompradosRuletaAdmin: Array<{ numero: number, username: string, timestamp: string }> = [];

  public ruletaSocket!: Socket;
  public username: string = '';

  public streamActual: string = 'defaultStream'; // Cambia esto según tu lógica de streams

  public numerosComprados: { [numero: number]: { buyer: string, amount: number } } = {};

  constructor(
    private ruletaService: RuletaService,
    private route: ActivatedRoute
  ) {
    // Puedes obtener el username desde localStorage o como lo manejes en tu app
    this.username = localStorage.getItem('username') || 'admin';
  }

  // NUEVO MÉTODO PARA GUARDAR EL TÍTULO
  guardarTituloRuleta(): void {
    if (!this.tituloRuleta.trim()) {
      alert('Por favor ingrese un título válido');
      return;
    }

    this.ruletaService.setRuletaTitle(this.tituloRuleta, this.salaActual).subscribe({
      next: () => {
        alert(`Título de la ruleta actualizado: "${this.tituloRuleta}"`);
        // Emitir el cambio via socket para notificar a los usuarios
        this.ruletaSocket.emit('ruleta_titulo_actualizado', {
          titulo: this.tituloRuleta,
          sala: this.salaActual
        });
      },
      error: (err) => {
        console.error('Error guardando título:', err);
        alert('Error al guardar el título');
      }
    });
  }

  // MÉTODO PARA CARGAR EL TÍTULO ACTUAL
  cargarTituloRuleta(): void {
    this.ruletaService.getRuletaTitle(this.salaActual).subscribe({
      next: (response: any) => {
        this.tituloRuleta = response.titulo || '';
      },
      error: (err) => console.error('Error cargando título:', err)
    });
  }

  ngOnInit(): void {
    this.cargarPrecios();
    this.cargarTituloRuleta(); // CARGAR TÍTULO AL INICIALIZAR
    
    this.route.params.subscribe(params => {
      this.salaActual = params['sala'] || 'global';
      this.cargarPrecios();
      this.cargarTituloRuleta(); // CARGAR TÍTULO AL CAMBIAR SALA
    });

    // Inicializa el socket antes de usarlo
    this.ruletaSocket = io(`${environment.apiUrl_ruleta}:446`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.ruletaSocket.on('connect', () => {
      this.ruletaSocket.emit('join_room', { sala: 'global', usuario: this.username });
      console.log('ADMIN emitió join_room para', this.username);
    });

    this.ruletaSocket.on('ruleta_empezar_giro', (data: { numeroGanador: number }) => {
      this.animarGiroRuleta(data.numeroGanador);
    });

    this.ruletaSocket.on('ruleta_numeros_actualizados', (data: any) => {
      this.numerosComprados = data.comprados || {};
    });
  }

  ngAfterViewInit() {
    if (this.ruletaCanvas) {
      this.ruletaCtx = this.ruletaCanvas.nativeElement.getContext('2d');
      this.drawRuletaWheel();
    }
  }

  ngAfterViewChecked() {
    // Solo dibuja si el popup está visible y no se ha dibujado en este ciclo
    if (this.mostrarPopupRuleta && !this.ruletaPopupWasVisible && this.ruletaCanvas) {
      this.ruletaCtx = this.ruletaCanvas.nativeElement.getContext('2d');
      this.drawRuletaWheel();
      this.ruletaPopupWasVisible = true;
    }
    // Si el popup se cerró, resetea el flag
    if (!this.mostrarPopupRuleta && this.ruletaPopupWasVisible) {
      this.ruletaPopupWasVisible = false;
    }
  }

   cargarPrecios(): void {
    this.ruletaService.getPrices(this.salaActual).subscribe({
      next: (response: any) => {
        // Soporta ambos formatos: { success: true, data: {...} } o solo { ... }
        const prices = ('data' in response) ? response.data : response;
        this.precios = {};
        for (const key in prices) {
          if (prices.hasOwnProperty(key)) {
            this.precios[Number(key)] = Number(prices[key]);
          }
        }
      },
      error: (err) => console.error('Error cargando precios:', err)
    });
  }

  guardarPrecio(): void {
    const precio = parseFloat(this.nuevoPrecio);
    if (isNaN(precio) || precio <= 0) {
      alert('Por favor ingrese un precio válido');
      return;
    }

  this.ruletaService.setNumberPrice(this.numeroSeleccionado, precio, this.salaActual).subscribe({
      next: () => {
        this.precios[this.numeroSeleccionado] = precio;
        this.nuevoPrecio = '';
        alert(`Precio para el número ${this.numeroSeleccionado} actualizado a $${precio.toFixed(2)}`);
      },
      error: (err) => {
        console.error('Error guardando precio:', err);
        alert('Error al guardar el precio');
      }
    });
  }

  resetRuleta(): void {
    if (confirm('¿Estás seguro de resetear la ruleta? Esto borrará todas las compras y apuestas.')) {
      this.ruletaService.resetRuleta(this.salaActual).subscribe({
        next: () => {
          alert('Ruleta reseteada correctamente');
          this.cargarPrecios();
        },
        error: (err) => {
          console.error('Error reseteando ruleta:', err);
          alert('Error al resetear la ruleta');
        }
      });
    }
  }

  // Función para formatear precios en el template
  formatPrice(price: number): string {
    return price ? '$' + price.toFixed(2) : '--';
  }


public onSeleccionarNumeroRuleta(num: number): void {
  this.numeroRuletaSeleccionado = num;
}
  // Dibuja la ruleta completa
  private drawRuletaWheel(highlightIndex: number | null = null) {
    if (!this.ruletaCanvas || !this.ruletaCtx) return;
    const ctx = this.ruletaCtx;
    const size = this.ruletaCanvas.nativeElement.width;
    const center = size / 2;
    const radius = center - 10;
    const n = this.ruletaNumbers.length;
    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < n; i++) {
      const angleStart = (2 * Math.PI * i) / n + this.ruletaAngle;
      const angleEnd = (2 * Math.PI * (i + 1)) / n + this.ruletaAngle;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, angleStart, angleEnd);
      ctx.closePath();
      // Colores personalizados
      if (this.ruletaNumbers[i].color === 'dorado') {
        ctx.fillStyle = '#fd9e00';
      } else if (this.ruletaNumbers[i].color === 'negro') {
        ctx.fillStyle = '#111';
      } else {
        ctx.fillStyle = '#888';
      }
      if (highlightIndex === i) ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Número
      ctx.save();
      ctx.translate(center, center);
      const angle = (angleStart + angleEnd) / 2;
      ctx.rotate(angle);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = this.ruletaNumbers[i].color === 'dorado' ? '#000' : '#fff';
      ctx.fillText(this.ruletaNumbers[i].num.toString(), radius * 0.7, 0);
      ctx.restore();
    }

    // Flecha/puntero arriba
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(Math.PI / 2); // 90 grados, arriba
    ctx.beginPath();
    ctx.moveTo(0, -radius - 5);
    ctx.lineTo(-12, -radius + 18);
    ctx.lineTo(12, -radius + 18);
    ctx.closePath();
    ctx.fillStyle = '#222';
    ctx.fill();
    ctx.restore();
  }

  // Gira la ruleta con animación
  private spinRuleta() {
    if (this.ruletaSpinning) return;
    this.ruletaSpinning = true;
    const n = this.ruletaNumbers.length;
    const selected = Math.floor(Math.random() * n);
    const anglePerSector = 2 * Math.PI / n;
    const targetAngle = (2 * Math.PI * 20) + (2 * Math.PI - (selected + 0.5) * anglePerSector); // 5 vueltas + caer en sector
    const duration = 20000; // ms
    const start = performance.now();
    const initialAngle = this.ruletaAngle;

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      this.ruletaAngle = initialAngle + (targetAngle - initialAngle) * ease;
      this.drawRuletaWheel();
      if (t < 1) {
        this.ruletaAnimationFrame = requestAnimationFrame(animate);
      } else {
        this.ruletaSpinning = false;
        this.ruletaAngle = this.ruletaAngle % (2 * Math.PI);
        this.drawRuletaWheel(selected);
        this.numeroRuletaSeleccionado = this.ruletaNumbers[selected].num;
      }
    };
    if (this.ruletaAnimationFrame) cancelAnimationFrame(this.ruletaAnimationFrame);
    this.ruletaAnimationFrame = requestAnimationFrame(animate);
  }

  public girarRuleta(): void {
    this.ruletaSocket.emit('ruleta_girar', {
      stream: this.streamActual, // <--- AGREGA ESTO
      sala: this.salaActual
    });
    console.log('ADMIN emitió ruleta_girar a sala', this.salaActual, 'y stream', this.streamActual);
  }

  // Cuando abras el popup, llama a esto:
  abrirPopupRuleta() {
    this.mostrarPopupRuleta = true;
  }

  cerrarPopupRuleta() {
    this.mostrarPopupRuleta = false;
    this.numeroRuletaSeleccionado = null;
    if (this.ruletaAnimationFrame) cancelAnimationFrame(this.ruletaAnimationFrame);
  }

  get esAdmin(): boolean {
    const rol = localStorage.getItem('Rol') || '';
    return rol === 'administrador' || rol === 'superUsuario';
  }

  animarGiroRuleta(numeroGanador: number) {
    const index = this.ruletaNumbers.findIndex(n => n.num === numeroGanador);
    if (index !== -1) {
      this.spinRuletaToIndex(index);
    }
  }

  // Y agrega este método para animar la ruleta hasta el índice ganador
  spinRuletaToIndex(targetIndex: number) {
    if (this.ruletaSpinning) return;
    this.ruletaSpinning = true;
    const n = this.ruletaNumbers.length;
    const anglePerSector = 2 * Math.PI / n;
    const targetAngle = (2 * Math.PI * 20) + (2 * Math.PI - (targetIndex + 0.5) * anglePerSector);
    const duration = 20000; // ms
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
    };
    if (this.ruletaAnimationFrame) cancelAnimationFrame(this.ruletaAnimationFrame);
    this.ruletaAnimationFrame = requestAnimationFrame(animate);
  }

  public iniciarNuevaRondaRuleta(): void {
    const numeroRonda = prompt('Número de la nueva ronda:');
    if (!numeroRonda || isNaN(Number(numeroRonda))) {
      alert('Debes ingresar un número válido.');
      return;
    }
    this.ruletaSocket.emit('nueva_ronda_ruleta', {
      stream: this.streamActual,
      sala: this.salaActual,
      numeroRonda: Number(numeroRonda)
    });
    alert(`Nueva ronda #${numeroRonda} iniciada para stream ${this.streamActual}, sala ${this.salaActual}`);
  }

  getNumeros() {
    return Object.keys(this.numerosComprados)
      .map(n => Number(n)) // <-- convierte a number
      .sort((a, b) => a - b);
  }
}