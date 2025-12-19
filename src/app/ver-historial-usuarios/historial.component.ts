import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-ver-historial-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.css']
})
export class VerHistorialUsuariosComponent implements OnInit {
    loadRetirosPorUsuario(): void {
      // Implementación vacía para evitar error de compilación. Puedes agregar la lógica real si es necesario.
    }
  username: string = '';
  historial: any[] = [];
  historialCompletoParaResumen: any[] = [];
  filteredHistorial: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  searchTerm: string = '';
  resumen: any = {};
  
  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 15;

  Math = Math;

  codigoStream: string = '';

  isSuperUser: boolean = false;

  retirosAceptados: number = 0;
  retirosRechazados: number = 0;
  montoTotalRetirado: number = 0;
  montoTotalRechazado: number = 0;

  // --- INICIO: Propiedades para el Resumen Diario ---
  showDailySummaryModal: boolean = false;
  dailySummary: any[] = [];
  paginatedDailySummary: any[] = [];
  currentDailyPage: number = 1;
  dailyItemsPerPage: number = 5;
  // --- FIN: Propiedades para el Resumen Diario ---

  constructor(
    private route: ActivatedRoute,
    private usersService: UsersService,
    private location: Location,
    private router: Router
  ) {}

  ngOnInit(): void {
    const rawRol = localStorage.getItem('rol');
    const rol = (rawRol || '').trim().toLowerCase();
    this.isSuperUser = rol === 'superusuario';
    this.route.params.subscribe(params => {
      this.username = params['username'];
      this.loadHistory();
      this.loadRetirosPorUsuario();
    });
    this.route.queryParams.subscribe(params => {
      this.currentPage = +params['page'] || 1;
    });
  }

  // --- INICIO: Métodos para el Resumen Diario ---

  toggleDailySummaryModal(show: boolean): void {
    this.showDailySummaryModal = show;
    if (show) {
      this.calculateDailySummary();
      this.pageChangedDaily(1);
    }
  }

  getCustomDay(date: Date): Date {
    const d = new Date(date);
    if (d.getHours() < 6) {
      d.setDate(d.getDate() - 1);
    }
    d.setHours(6, 0, 0, 0);
    return d;
  }

  calculateDailySummary(): void {
    if (!this.historialCompletoParaResumen || this.historialCompletoParaResumen.length === 0) {
      this.dailySummary = [];
      return;
    }

    const fechaLimite = new Date('2025-12-18T06:00:00');

    const historialFiltrado = this.historialCompletoParaResumen.filter(item => {
      const itemDate = new Date(item.fecha);
      return itemDate >= fechaLimite;
    });

    if (historialFiltrado.length === 0) {
      this.dailySummary = [];
      return;
    }

    const groupedByDay: { [key: string]: any[] } = {};
    historialFiltrado.forEach(item => {
      const itemDate = new Date(item.fecha);
      const customDay = this.getCustomDay(itemDate);
      const dayKey = customDay.toISOString().split('T')[0];
      if (!groupedByDay[dayKey]) {
        groupedByDay[dayKey] = [];
      }
      groupedByDay[dayKey].push(item);
    });

    const sortedDays = Object.keys(groupedByDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const esMovimientoManual = (item: any) =>
      item.tipo === 'modificacion_admin' || 
      item.originalTipo === 'modificacion_admin';

    const esRetiro = (item: any) =>
      (item.tipo === 'restar_saldo' || item.originalTipo === 'restar_saldo') &&
      !esMovimientoManual(item);

    // Calcular saldo inicial SIN modificaciones manuales
    let saldoInicialDelDia = this.resumen.saldoActual || 0;
    
    // Restar TODAS las transacciones (apuestas, recargas, retiros) EXCEPTO modificaciones manuales
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      const dayKey = sortedDays[i];
      const movimientosDia = groupedByDay[dayKey];
      const cambioNetoDia = movimientosDia
        .filter(item => !esMovimientoManual(item) && !esRetiro(item))
        .reduce((acc, item) => acc + (item.cantidadFinal || 0), 0);
      const retirosDelDia = movimientosDia
        .filter(item => esRetiro(item))
        .reduce((acc, item) => acc + Math.abs(item.cantidadFinal || 0), 0);
      
      saldoInicialDelDia -= (cambioNetoDia - retirosDelDia);
    }

    const summary: any[] = [];
    for (const dayKey of sortedDays) {
      const dayTransactions = groupedByDay[dayKey];

      const transaccionesValidas = dayTransactions.filter(
        item => !esMovimientoManual(item) && !esRetiro(item) && item.tipo !== 'recarga'
      );

      const cambioNetoDelDia = dayTransactions
        .filter(item => !esMovimientoManual(item) && !esRetiro(item))
        .reduce((acc, item) => acc + (item.cantidadFinal || 0), 0);

      const totalGanado = transaccionesValidas
        .filter(item => item.cantidadFinal > 0)
        .reduce((acc, item) => acc + item.cantidadFinal, 0);
      
      const totalPerdido = transaccionesValidas
        .filter(item => item.cantidadFinal < 0)
        .reduce((acc, item) => acc + Math.abs(item.cantidadFinal), 0);
      
      const recargas = dayTransactions
        .filter(item => item.tipo === 'recarga' && !esMovimientoManual(item))
        .reduce((acc, item) => acc + Math.abs(item.cantidad || item.cantidadFinal), 0);
      
      const retiros = dayTransactions
        .filter(item => esRetiro(item))
        .reduce((acc, item) => acc + Math.abs(item.cantidad || item.cantidadFinal), 0);

      const saldoFinal = saldoInicialDelDia + cambioNetoDelDia - retiros;

      summary.push({
        fecha: new Date(dayKey + 'T06:00:00'),
        saldoInicial: saldoInicialDelDia,
        saldoFinal,
        totalGanado,
        totalPerdido,
        recargas,
        retiros
      });

      saldoInicialDelDia = saldoFinal;
    }

    this.dailySummary = summary.reverse();
  }

  get totalDailyPages(): number {
    return Math.ceil(this.dailySummary.length / this.dailyItemsPerPage);
  }

  pageChangedDaily(page: number): void {
    if (page < 1 || page > this.totalDailyPages) {
      return;
    }
    this.currentDailyPage = page;
    const startIndex = (page - 1) * this.dailyItemsPerPage;
    this.paginatedDailySummary = this.dailySummary.slice(startIndex, startIndex + this.dailyItemsPerPage);
  }

  // --- FIN: Métodos para el Resumen Diario ---

  loadHistory(): void {
    this.loading = true;
    let historialApuestas: any[] = [];
    let resumenApuestas: any = {};
    let historialSaldos: any[] = [];

    this.usersService.getUserHistoryByRounds(this.username).subscribe({
      next: (response) => {
        if (response?.success) {
          historialApuestas = response.historial || [];
          resumenApuestas = response.resumen || {};
        }
        this.usersService.getUserSaldoRecords(this.username).subscribe({
          next: (saldoResponse) => {
            if (Array.isArray(saldoResponse)) {
              historialSaldos = saldoResponse.map((item: any) => {
                // Determinar el valor correcto de cantidadFinal según el tipo
                let cantidadFinal: number;
                const cantidadBase = Math.abs(item.cantidad ?? item.saldo ?? 0);
                
                if (item.tipo === 'recarga') {
                  // Recargas siempre suman
                  cantidadFinal = cantidadBase;
                } else if (item.tipo === 'restar_saldo' || item.tipo === 'retiro_aprobado') {
                  // Retiros siempre restan
                  cantidadFinal = -cantidadBase;
                } else if (item.tipo === 'modificacion_admin') {
                  // Modificaciones manuales: respetar el signo original del backend
                  cantidadFinal = item.saldo;
                } else {
                  // Fallback: usar el signo original
                  cantidadFinal = item.saldo ?? item.cantidad ?? 0;
                }
                
                return {
                  fecha: item.fecha,
                  concepto: item.concepto || '',
                  cantidad: cantidadBase,
                  cantidadFinal: cantidadFinal,
                  tipo: item.tipo,
                  originalTipo: item.tipo,
                  tipoMovimiento: cantidadFinal < 0 ? 'descuento' : 'aumento',
                  color: '',
                  resultado: '',
                  sala: item.sala || ''
                };
              });
            }
            const historialUnido = [...historialApuestas, ...historialSaldos].sort((a, b) => {
              return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
            });
            this.historial = historialUnido;
            this.historialCompletoParaResumen = [...historialUnido];
            this.resumen = resumenApuestas;
            this.filteredHistorial = [...this.historial];
            this.loading = false;
          },
          error: () => {
            this.historial = historialApuestas;
            this.historialCompletoParaResumen = [...historialApuestas];
            this.resumen = resumenApuestas;
            this.filteredHistorial = [...this.historial];
            this.loading = false;
          }
        });
      },
      error: () => {
        this.error = 'Error al cargar el historial';
        this.loading = false;
      }
    });
  }

  aplicarFiltros() {
    let datos = [...this.historial];

    // Filtro por stream (campo sala)
    if (this.codigoStream && this.codigoStream.trim()) {
      datos = datos.filter(
        (item: any) =>
          item.sala &&
          item.sala.toLowerCase().includes(this.codigoStream.trim().toLowerCase())
      );
    }

    // Filtro por búsqueda general
    if (this.searchTerm && this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      datos = datos.filter(
        (item: any) =>
          (item.concepto && item.concepto.toLowerCase().includes(term)) ||
          (item.color && item.color.toLowerCase().includes(term)) ||
          (item.queda && item.queda.toLowerCase().includes(term)) ||
          (item.resultado && item.resultado.toLowerCase().includes(term))
      );
    }

    this.filteredHistorial = datos;
    this.pageChanged(1);
  }

  get paginatedItems(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredHistorial.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredHistorial.length / this.itemsPerPage);
  }

  pageChanged(page: number): void {
    this.currentPage = page;
  }

  goBack(): void {
    this.location.back();
  }

  formatNumber(num: number | string): string {
    const numberValue = typeof num === 'string'
      ? parseFloat(num.toString().replace(/[\$,]/g, ''))
      : num;
    if (isNaN(numberValue)) return '$0.00';
    const absValue = Math.abs(numberValue).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    if (numberValue > 0) {
      return '+$' + absValue;
    }
    if (numberValue < 0) {
      return '-$' + absValue;
    }
    // Para cero, solo el símbolo de pesos
    return '$' + absValue;
  }

  formatNumberNoPlus(num: number | string): string {
    const numberValue = typeof num === 'string'
      ? parseFloat(num.toString().replace(/[\$,]/g, ''))
      : num;
    if (isNaN(numberValue)) return '$0.00';
    const absValue = Math.abs(numberValue).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    if (numberValue < 0) {
      return '-$' + absValue;
    }
    return '$' + absValue;
  }

  getColorClass(color: string): string {
    return color === 'ROJO' ? 'color-rojo' : 'color-verde';
  }

  getResultClass(resultado: string): string {
    switch(resultado) {
      case 'Gana': return 'result-gana';
      case 'Pierde': return 'result-pierde';
      case 'TABLAS': return 'result-tablas';
      default: return '';
    }
  }

  getGananciasTotales(): number {
    return this.filteredHistorial
      .filter(item => item.cantidadFinal > 0)
      .reduce((acc, item) => acc + item.cantidadFinal, 0);
  }

  getPerdidasTotales(): number {
    return this.filteredHistorial
      .filter(item => item.cantidadFinal < 0)
      .reduce((acc, item) => acc + Math.abs(item.cantidadFinal), 0);
  }

  formatPerdidas(num: number | string): string {
    const numberValue = typeof num === 'string'
      ? parseFloat(num.toString().replace(/[\$,]/g, ''))
      : num;
    if (isNaN(numberValue)) return '-$0.00';
    const absValue = Math.abs(numberValue).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return '-$' + absValue;
  }
}