import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { HttpClientModule } from '@angular/common/http';

interface SaldoRecord {
  _id: string;
  saldo: number;
  fecha: string;
  usuario: string;
  concepto: string;
  tipo: string;
  __v: number;
}

@Component({
  selector: 'app-historial-saldos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial-saldos.component.html',
  styleUrls: ['./historial-saldos.component.css']
})
export class HistorialSaldosComponent implements OnInit {
  allRecords: SaldoRecord[] = [];
  filteredRecords: SaldoRecord[] = [];
  paginatedRecords: SaldoRecord[] = [];
  loading: boolean = false;
  error: string = '';
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;
  
  // Filtering
  startDate: string = '';
  endDate: string = '';
  selectedUser: string = '';
  selectedType: string = '';
  
  // Unique values for filters
  uniqueUsers: string[] = [];
  uniqueTypes: string[] = [];

  // Make Math available in template
  Math = Math;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadRecords();
  }

  loadRecords() {
    this.loading = true;
    this.error = '';
    
    // Determine which endpoint to use based on filters
    let apiUrl = `${environment.apiUrl}:444/api/saldos/obtener-registros-saldos`;
    
    // If we have a specific user selected, use the user endpoint
    if (this.selectedUser) {
      apiUrl = `${environment.apiUrl}:444/api/saldos/obtener-registros-por-usuario/${encodeURIComponent(this.selectedUser)}`;
    }
    // If we have a specific date range and start date equals end date, use the date endpoint
    else if (this.startDate && this.endDate && this.startDate === this.endDate) {
      apiUrl = `${environment.apiUrl}:444/api/saldos/obtener-registros-por-fecha`;
    }
    
    this.http.get<SaldoRecord[]>(apiUrl)
      .subscribe({
        next: (data) => {
          this.allRecords = data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
          this.extractUniqueValues();
          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar los registros. Por favor intenta nuevamente.';
          this.loading = false;
          console.error('Error:', err);
        }
      });
  }

  extractUniqueValues() {
    this.uniqueUsers = [...new Set(this.allRecords.map(record => record.usuario))].sort();
    this.uniqueTypes = [...new Set(this.allRecords.map(record => record.tipo).filter(tipo => tipo))].sort();
  }

  applyFilters() {
    this.filteredRecords = this.allRecords.filter(record => {
      const recordDate = new Date(record.fecha);
      
      // Date filtering
      if (this.startDate && recordDate < new Date(this.startDate)) {
        return false;
      }
      if (this.endDate && recordDate > new Date(this.endDate + 'T23:59:59')) {
        return false;
      }
      
      // User filtering
      if (this.selectedUser && record.usuario !== this.selectedUser) {
        return false;
      }
      
      // Type filtering
      if (this.selectedType && record.tipo !== this.selectedType) {
        return false;
      }
      
      return true;
    });
    
    this.totalPages = Math.ceil(this.filteredRecords.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedRecords = this.filteredRecords.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onDateChange() {
    // If we have a single date (start and end are the same), use server-side filtering
    if (this.startDate && this.endDate && this.startDate === this.endDate) {
      this.loadRecords();
    } else {
      // Use client-side filtering for date ranges
      this.applyFilters();
    }
  }

  resetFilters() {
    this.startDate = '';
    this.endDate = '';
    this.selectedUser = '';
    this.selectedType = '';
    this.loadRecords();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString("es-ES", { 
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTypeDisplayName(tipo: string): string {
    const typeMap: { [key: string]: string } = {
      'recarga': 'Recarga',
      'restar_saldo': 'Restar Saldo',
      'modificacion_admin': 'Modificación Admin',
      '': 'Sin Tipo'
    };
    return typeMap[tipo] || tipo;
  }

  getTotalBalance(): number {
    return this.filteredRecords.reduce((total, record) => total + this.getDisplaySaldo(record), 0);
  }

  getDisplaySaldo(record: SaldoRecord): number {
    // Show negative values for balance subtractions
    if (record.tipo === 'restar_saldo') {
      return -Math.abs(record.saldo);
    }
    return record.saldo;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const halfRange = Math.floor(maxPagesToShow / 2);
    
    let startPage = Math.max(1, this.currentPage - halfRange);
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
} 