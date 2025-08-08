import { Component, OnInit, OnDestroy } from '@angular/core';
import { QuinielaService } from 'src/app/services/quiniela.service';
import { UsersService } from 'src/app/services/users.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, take } from 'rxjs';

@Component({
  selector: 'app-rifa-page',
  templateUrl: './rifa.component.html',
  styleUrls: ['./rifa.component.css']
})
export class RifaPageComponent implements OnInit, OnDestroy {
  rifas: any[] = [];
  loading = true;
  comprando = false;
  isAdmin = false;
  modalGanadorAbierto = false;
  modalCompraAbierto = false;
  rifaSeleccionada: any = null;
  
  private salaActual: string = 'global'; 
  private refreshInterval: any;
  private username: string = localStorage.getItem('nombreUsuario') || '';

  constructor(
    private quinielaService: QuinielaService,
    private usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['sala']) {
        this.salaActual = params['sala'];
        this.quinielaService.setRoom(this.salaActual); // Notifica al servicio la sala actual
      }
    });

    this.checkAdminStatus();
    this.cargarRifas();
    
    // Refresca las rifas cada 5 segundos para mantener la información actualizada
    this.refreshInterval = setInterval(() => {
      this.cargarRifas();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private checkAdminStatus() {
    const rol = localStorage.getItem('Rol') || '';
    this.isAdmin = rol === 'superUsuario' || rol === 'administrador';
  }

  cargarRifas() {
    this.loading = true;
    this.quinielaService.obtenerRifasPorSala(this.salaActual).subscribe({
      next: (data: any) => {
        this.rifas = data.map((rifa: any) => ({
          ...rifa,
          numerosDisponibles: this.generarNumerosDisponibles(rifa),
          totalRecaudado: this.calcularTotalRecaudado(rifa)
        }));
        this.loading = false;
      },
      error: (error) => {
        console.error(`Error al cargar rifas para la sala ${this.salaActual}:`, error);
        this.loading = false;
      }
    });
  }

  generarNumerosDisponibles(rifa: any): number[] {
    const totalNumeros = rifa.totalNumeros || 0;
    const numerosVendidos = rifa.numerosVendidos || {};
    const disponibles = [];
    for (let i = 1; i <= totalNumeros; i++) {
      if (!numerosVendidos.hasOwnProperty(i.toString())) {
        disponibles.push(i);
      }
    }
    return disponibles;
  }

  calcularTotalRecaudado(rifa: any): number {
    const vendidos = rifa.numerosVendidos ? Object.keys(rifa.numerosVendidos).length : 0;
    return vendidos * rifa.precioNumero;
  }

  getNumerosVendidos(rifa: any) {
    return Object.entries(rifa.numerosVendidos || {}).map(([numero, username]) => ({
      numero,
      username
    }));
  }

  // REEMPLAZA EL MÉTODO 'comprarNumero' EN ESTE ARCHIVO CON ESTO:
  comprarNumero(rifa: any, numero: number) {
    // 1. Obtenemos los datos que faltan para la llamada a la API
    const username = localStorage.getItem('nombreUsuario');
    let salaActual = '';

    // Obtenemos el valor actual de la sala desde el servicio
    this.quinielaService.room$.pipe(take(1)).subscribe(room => {
      if (room) {
        salaActual = room;
      }
    });

    // 2. Validamos que tenemos toda la información
    if (!username) {
      alert('Error: No se pudo identificar al usuario. Por favor, inicie sesión de nuevo.');
      return;
    }
    if (!salaActual) {
      alert('Error: No se pudo determinar la sala actual.');
      return;
    }

    // Aquí puedes añadir tu lógica de 'comprandoNumero' y validación de saldo si existe en este componente
    // this.comprandoNumero = true;
    // if (this.balance < rifa.precioNumero) { ... }

    // 3. Llamamos al servicio con los 4 argumentos requeridos, en el orden correcto.
    this.quinielaService.comprarNumeroHTTP(rifa.numeroRifa, numero, username, salaActual).subscribe({
      next: () => {
        // this.comprandoNumero = false;
        alert(`🎉 ¡Número ${numero} comprado exitosamente!`);
        // Aquí deberías tener una función para recargar los datos de la rifa y ver el cambio
        // this.cargarDatosDeLaRifa(); 
      },
      error: (err: any) => {
        // this.comprandoNumero = false;
        const mensaje = err.error?.error || err.message || 'Error desconocido';
        alert(`❌ Error al comprar número: ${mensaje}`);
      }
    });
  }

  abrirModalCompra(rifa: any) {
    this.rifaSeleccionada = rifa;
    this.modalCompraAbierto = true;
  }

  cerrarModalCompra() {
    this.modalCompraAbierto = false;
    this.rifaSeleccionada = null;
  }

  crearRifa(rifaData: any) {
    if (confirm(`¿Iniciar rifa "${rifaData.nombre}" (#${rifaData.numeroRifa}) en la sala ${this.salaActual}?`)) {
      const datosParaServicio = {
        nombre: rifaData.nombre,
        numeroRifa: rifaData.numeroRifa,
        cantidadNumeros: rifaData.cantidadNumeros,
        precioNumero: rifaData.precioNumero,
        room: this.salaActual
      };

      this.quinielaService.crearRifa(datosParaServicio).subscribe({
        next: () => {
          this.cargarRifas();
          alert('¡Rifa iniciada!');
        },
        error: (err) => {
          alert(err.error?.error || 'Error al iniciar rifa');
        }
      });
    }
  }

  cerrarVentas(rifa: any) {
    if (confirm(`¿Cerrar ventas para rifa #${rifa.numeroRifa}?`)) {
      this.quinielaService.cerrarVentas(rifa.numeroRifa).subscribe({
        next: () => {
          this.cargarRifas();
          alert('¡Ventas cerradas!');
        },
        error: (err) => alert(err.error?.error || 'Error al cerrar ventas')
      });
    }
  }

  abrirSeleccionarGanador(rifa: any) {
    this.rifaSeleccionada = rifa;
    this.modalGanadorAbierto = true;
  }

  // MÉTODO CORREGIDO
  seleccionarGanador(rifa: any, numeroGanador: number) {
    if (confirm(`¿Seleccionar número ${numeroGanador} como ganador para rifa #${rifa.numeroRifa}?`)) {
      
      // CORRECCIÓN: Usamos 'rifa.numeroRifa' (del parámetro) en lugar de 'this.rifa.numeroRifa'
      this.quinielaService.seleccionarGanador(rifa.numeroRifa, numeroGanador, this.isAdmin).subscribe({
        next: (ganadorInfo: any) => {
          this.cargarRifas();
          alert(`Ganador seleccionado: ${ganadorInfo.username} con número ${ganadorInfo.numero}`);
          this.cerrarModalGanador();
        },
        error: (err) => alert(err.error?.error || 'Error al seleccionar ganador')
      });
    }
  }

  cerrarModalGanador() {
    this.modalGanadorAbierto = false;
    this.rifaSeleccionada = null;
  }

  volver() {
    this.router.navigate(['/chat']);
  }
}