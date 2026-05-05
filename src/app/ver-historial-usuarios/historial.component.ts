import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-ver-historial-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.css']
})
export class VerHistorialUsuariosComponent implements OnInit {
  username: string = '';
  historial: any[] = [];
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

  constructor(
    private route: ActivatedRoute,
    private usersService: UsersService,
    private location: Location
  ) {}

  ngOnInit(): void {
    const rawRol = localStorage.getItem('rol');
    const rol = (rawRol || '').trim().toLowerCase();
    this.isSuperUser = rol === 'superusuario';
    console.log('Valor en localStorage rol:', rawRol, '| ROL normalizado:', rol, '| isSuperUser:', this.isSuperUser);
    this.route.params.subscribe(params => {
      this.username = params['username'];
      this.loadHistory();
    });
  }

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
              // -------------------------------------------------------------
              // FILTRO: ocultar movimientos automáticos derivados de apuestas.
              // Solo se muestran modificaciones manuales del admin / recargas
              // / retiros. Los registros tipo "Aumento automático al ganar",
              // "Aumento automatico al devolver", "Apuesta P{N}", etc., son
              // movimientos internos que ya están reflejados en las filas
              // agregadas P{N} de getUserHistoryByRounds.
              //
              // Misma lista que usa el componente admin (historial-saldos).
              // -------------------------------------------------------------
              const OCULTAR_TIPOS = [
                'restar_saldo',
                'saldo_devuelto',
                'apuesta_ganada',
                'apuesta_creada',
                'apuesta_devuelta',
                'comision_banca',
                'balance_ronda'
              ];
              const OCULTAR_CONCEPTOS_CONTIENE = [
                'aumento automático al ganar',
                'aumento automatico al ganar',
                'aumento automatico al devolver',
                'aumento automático al devolver',
                'devolver la apuesta',
                'apuesta no cazada',
                'apuesta por empate',
                'descuento automático',
                'descuento automatico',
                'apuesta p',         // "Apuesta P1", "Apuesta P62", etc.
                'pago con ajuste',
                'comisión',
                'comision',
                'devolución',
                'devolucion'
              ];

              historialSaldos = saldoResponse
                .filter((item: any) => {
                  const tipo = (item.tipo || '').toString().toLowerCase();
                  const concepto = (item.concepto || '').toString().toLowerCase();
                  if (OCULTAR_TIPOS.includes(tipo)) return false;
                  if (OCULTAR_CONCEPTOS_CONTIENE.some(c => concepto.includes(c))) return false;
                  return true;
                })
                .map((item: any) => ({
                  fecha: item.fecha,
                  concepto: item.concepto,
                  cantidad: item.saldo,
                  cantidadFinal: item.saldo, // El signo se conserva
                  tipoMovimiento: item.saldo < 0 ? 'descuento' : 'aumento',
                  color: '',
                  resultado: ''
                }));
            }
            const historialUnido = [...historialApuestas, ...historialSaldos].sort((a, b) => {
              return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
            });
            this.historial = historialUnido
              .filter(item => (item.concepto || '').toString().trim().toLowerCase() !== 'correccion');
            this.resumen = resumenApuestas;
            this.filteredHistorial = [...this.historial];
            this.loading = false;
            this.aplicarFiltros(); // <-- Asegúrate de llamar esto aquí
          },
          error: () => {
            this.historial = historialApuestas;
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

    // Filtro global: ocultar todos los registros con concepto "correccion"
    datos = datos.filter(item => (item.concepto || '').toLowerCase() !== 'correccion');

    // Filtro global: ocultar todos los registros con resultado o queda "Tablas" (empate)
    datos = datos.filter(item => {
      const resultado = (item.resultado || '').toString().trim().toLowerCase();
      const queda = (item.queda || '').toString().trim().toLowerCase();
      return resultado !== 'tablas' && queda !== 'tablas';
    });

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