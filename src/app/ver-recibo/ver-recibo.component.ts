import { Component, OnInit } from '@angular/core';
import { RecipesService } from '../services/recipes.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UsersService } from '../services/users.service';
import { NotificacionGlobalService } from '../chat/notification.service';

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
  loadingStates: { [id: string]: boolean } = {}; // Para manejar el estado de carga de cada recibo

  // NUEVO: Propiedades para el resumen
  recibosAceptados: number = 0;
  recibosRechazados: number = 0;
  montoAcumulado: number = 0;
  recibosAceptadosHistorial: any[] = [];
  diasOperativos: string[] = [];
  diaSeleccionado: string | null = null;
  paginaActual: number = 1;
  recibosPorPagina: number = 40;

  get totalPaginas(): number {
    return Math.ceil(this.recibosAceptadosHistorial.length / this.recibosPorPagina);
  }

  get recibosPaginados() {
    if (!this.diaSeleccionado) {
      return [];
    }
    const inicioDia = new Date(this.diaSeleccionado + 'T00:00:00Z');
    inicioDia.setUTCHours(7, 0, 0, 0);

    const finDia = new Date(inicioDia);
    finDia.setUTCDate(finDia.getUTCDate() + 1);

    return this.recibosAceptadosHistorial.filter(recibo => {
      const fechaRecibo = new Date(recibo.fecha);
      return fechaRecibo >= inicioDia && fechaRecibo < finDia;
    });
  }

  // NUEVO: Getter para calcular el total del día seleccionado
  get totalPorDia(): number {
    return this.recibosPaginados.reduce((acc, recibo) => acc + (Number(recibo.monto) || 0), 0);
  }
  cambiarDia(direccion: 'anterior' | 'siguiente') {
    if (!this.diaSeleccionado) return;
    const indiceActual = this.diasOperativos.indexOf(this.diaSeleccionado);

    if (direccion === 'siguiente' && indiceActual > 0) {
      this.diaSeleccionado = this.diasOperativos[indiceActual - 1];
    } else if (direccion === 'anterior' && indiceActual < this.diasOperativos.length - 1) {
      this.diaSeleccionado = this.diasOperativos[indiceActual + 1];
    }
  }

  get esPrimerDia(): boolean {
    if (!this.diaSeleccionado) return true;
    const indiceActual = this.diasOperativos.indexOf(this.diaSeleccionado);
    return indiceActual === this.diasOperativos.length - 1;
  }

  get esUltimoDia(): boolean {
    if (!this.diaSeleccionado) return true;
    const indiceActual = this.diasOperativos.indexOf(this.diaSeleccionado);
    return indiceActual === 0;
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
    private router: Router,
    private notificacionService: NotificacionGlobalService
  ) { }

  ngOnInit(): void {
    this.loadPendientes();
    this.actualizarResumen();
    this.resumenInterval = setInterval(() => this.actualizarResumen(), 30000);
  }

  loadPendientes(): void {
    this.recipeService.getAll('pendiente').subscribe(recipes => {
      this.recipes = this.sortRecipesAlphabetically(recipes || [])
        .map(r => ({
          ...r,
          estado: r.estado || 'pendiente'
        }));
    });
  }

  actualizarResumen() {
    this.recipeService.getResumen().subscribe((resumen: any) => {
      this.recibosAceptadosHistorial = (resumen?.aprobado?.items || [])
        .map((r: any) => ({
          _id: r._id,
          fecha: r.fechaAprobacion || r.fecha || '',
          username: r.username,
          monto: r.monto,
          banco: r.banco,
        }))
        .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      const dias = new Set<string>();
      this.recibosAceptadosHistorial.forEach(recibo => {
        const fecha = new Date(recibo.fecha);
        const fechaAjustada = new Date(fecha);
        fechaAjustada.setHours(fechaAjustada.getHours() - 7);
        const diaOperativo = fechaAjustada.toISOString().split('T')[0];
        dias.add(diaOperativo);
      });
      this.diasOperativos = Array.from(dias);

      if (!this.diaSeleccionado && this.diasOperativos.length > 0) {
        this.diaSeleccionado = this.diasOperativos[0];
      }

      this.recibosAceptados = Number(resumen?.aprobado?.monto) || 0;
      this.recibosRechazados = Number(resumen?.rechazado?.monto) || 0;
      this.montoAcumulado = Number(resumen?.pendiente?.monto) || 0;
    });
  }

  loadRecipes(): void {
    this.loadPendientes();
  }

  verRecibo(recipe: any) {
    this.selectedUser = recipe;
    this.modalImageUrl = this.getImageUrl(recipe._id);
    console.log(`[FRONTEND-DEBUG] verRecibo: Abriendo recibo ID: ${recipe._id}`);
    console.log(`[FRONTEND-DEBUG] verRecibo: URL generada: ${this.modalImageUrl}`);
    this.modalVisible = true;
    this.modalImageError = false;
  }

  modalImageError: boolean = false; // Nueva variable

  verReciboAceptado(recibo: any) {
    this.selectedUser = recibo;
    this.modalImageUrl = this.getImageUrl(recibo._id);
    console.log(`[FRONTEND-DEBUG] verReciboAceptado: Abriendo recibo ID: ${recibo._id}`);
    console.log(`[FRONTEND-DEBUG] verReciboAceptado: URL generada: ${this.modalImageUrl}`);
    this.modalVisible = true;
    this.modalImageError = false; // Reinicia el error
  }


  cerrarModal() {
    console.log(`[FRONTEND-DEBUG] cerrarModal: Cerrando modal.`);
    this.modalVisible = false;
    this.modalImageUrl = '';
    this.selectedUser = null;
    this.modalImageError = false; // Reinicia el error
  }

  // Métodos para logs desde el HTML
  logImageSuccess() {
    console.log(`[FRONTEND-DEBUG] EXITO: La imagen del recibo cargó correctamente.`);
  }

  logImageError(event: any) {
    console.error(`[FRONTEND-DEBUG] ERROR: Falló la carga de la imagen.`);
    console.error(event);
    this.modalImageError = true;
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
      this.notificacionService.restarPendiente();

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
      this.notificacionService.restarPendiente();
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