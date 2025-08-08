import { Component, OnInit } from '@angular/core';
import { RecipesService } from '../services/recipes.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-ver-recibo',
  templateUrl: './ver-recibo.component.html',
  styleUrls: ['./ver-recibo.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class VerReciboComponent implements OnInit {
  recipes: any[] = [];
  modalVisible: boolean = false;
  modalImageUrl: string = '';
  selectedUser: any = null;
  loadingStates: {[id: string]: boolean} = {}; // Para manejar el estado de carga de cada recibo

  // NUEVO: Propiedades para el resumen
  recibosAceptados: number = 0;
  recibosRechazados: number = 0;
  montoAcumulado: number = 0;
  recibosAceptadosHistorial: any[] = [];
  paginaActual: number = 1;
  recibosPorPagina: number = 40;

  get totalPaginas(): number {
    return Math.ceil(this.recibosAceptadosHistorial.length / this.recibosPorPagina);
  }

  get recibosPaginados() {
    const inicio = (this.paginaActual - 1) * this.recibosPorPagina;
    return this.recibosAceptadosHistorial.slice(inicio, inicio + this.recibosPorPagina);
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas) {
      this.paginaActual = nuevaPagina;
    }
  }

  // Botón de reset: elimina todos los recibos aceptados
  resetHistorialAceptados() {
    if (confirm('¿Seguro que deseas eliminar todo el historial de recibos aceptados?')) {
      this.recipeService.deleteAllAceptados().subscribe(() => {
        this.actualizarResumen();
      });
    }
  }

  private resumenInterval: any; // Para limpiar el intervalo si es necesario

  constructor(
    private userService: UsersService,
    private recipeService: RecipesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.recipeService.getAll().subscribe(recipes => {
      this.recipes = this.sortRecipesAlphabetically(recipes)
        .filter(r => r.estado === 'pendiente' || !r.estado) // Solo pendientes
        .map(r => ({
          ...r,
          estado: r.estado || 'pendiente'
        }));
    });

    // NUEVO: Actualización en tiempo real del resumen
    this.actualizarResumen();
    this.resumenInterval = setInterval(() => this.actualizarResumen(), 2000);
  }

  // NUEVO: Método para actualizar el resumen
  actualizarResumen() {
    this.recipeService.getAll().subscribe((recibos: any[]) => {
      this.recibosAceptadosHistorial = recibos
        .filter((r: any) => r.estado === 'aprobado')
        .map((r: any) => ({
          fecha: r.fechaAprobacion || r.fecha || '', // usa fechaAprobacion si existe
          username: r.username,
          monto: r.monto,
          banco: r.banco,
        }));

      this.recibosAceptados = recibos
        .filter((r: any) => r.estado === 'aprobado')
        .reduce((acc: number, r: any) => acc + (Number(r.monto) || 0), 0);

      this.recibosRechazados = recibos
        .filter((r: any) => r.estado === 'rechazado')
        .reduce((acc: number, r: any) => acc + (Number(r.monto) || 0), 0);

      this.montoAcumulado = recibos
        .filter((r: any) => r.estado === 'pendiente' || !r.estado)
        .reduce((acc: number, r: any) => acc + (Number(r.monto) || 0), 0);
    });
  }

  loadRecipes(): void {
    this.recipeService.getAll().subscribe(recipes => {
      this.recipes = this.sortRecipesAlphabetically(recipes);
    });
  }

  verRecibo(recipe: any) {
    this.selectedUser = recipe;
    this.modalImageUrl = this.getImageUrl(recipe._id);
    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
    this.modalImageUrl = '';
    this.selectedUser = null;
  }

  getImageUrl(id: string): string {
    return this.recipeService.getImageUrl(id);
  }

  volver(): void {
    this.router.navigate(['/Admin']);
  }

 async aceptar(username: string, id: string, monto: number): Promise<void> {
    this.loadingStates[id] = true;
    
    try {
      // 1. Actualizar saldo del usuario
      await this.userService.updateSaldo(username, monto, "recarga de saldo", "recarga");
      
      // 2. Actualizar estado del recibo (sin toPromise() porque ya es una Promesa)
      await this.recipeService.updateEstado(id, 'aprobado');
      
      // 3. Actualizar vista
      this.recipes = this.recipes.filter(r => r._id !== id);
      this.cerrarModal();
      
      // 4. Actualizar resumen inmediatamente
      this.actualizarResumen();
      
    } catch (error) {
      console.error('Error en aceptar recibo:', error);
      alert('Error al procesar la solicitud');
    } finally {
      this.loadingStates[id] = false;
    }
  }

  // Método rechazar corregido
  async rechazar(id: string): Promise<void> {
    this.loadingStates[id] = true;
    
    try {
      // 1. Actualizar estado del recibo (sin toPromise())
      await this.recipeService.updateEstado(id, 'rechazado');
      
      // 2. Actualizar vista
      this.recipes = this.recipes.filter(r => r._id !== id);
      this.cerrarModal();
      
      // 3. Actualizar resumen inmediatamente
      this.actualizarResumen();
      
      alert("Solicitud rechazada correctamente");
    } catch (error) {
      console.error('Error en rechazar recibo:', error);
      alert('Error al rechazar la solicitud');
    } finally {
      this.loadingStates[id] = false;
    }
  }

  private sortRecipesAlphabetically(recipes: any[]): any[] {
    return recipes.sort((a, b) => {
      if (a.username.toLowerCase() < b.username.toLowerCase()) return -1;
      if (a.username.toLowerCase() > b.username.toLowerCase()) return 1;
      return 0;
    });
  }

  // Opcional: limpiar el intervalo si el componente se destruye
  ngOnDestroy(): void {
    if (this.resumenInterval) {
      clearInterval(this.resumenInterval);
    }
  }
}