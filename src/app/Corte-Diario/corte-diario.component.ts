import { Component, OnInit, OnDestroy } from '@angular/core';
import { CorteDiarioService } from '../services/corte-diario.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuComponent } from '../menu/menu.component'; // Ajusta la ruta si es necesario

@Component({
  selector: 'app-corte-diario',
  templateUrl: './corte-diario.component.html',
  styleUrls: ['./corte-diario.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MenuComponent] // <-- agrega aquí
})
export class CorteDiarioComponent implements OnInit, OnDestroy {
  corteDiario: any = null;
  corteStreamCodigo: string = '';
  corteInterval: any = null;
  ultimoStreamConsultado: string = '';
  historialCortes: any[] = [];
  paginaHistorial: number = 1;
  cortesPorPagina: number = 5;
  mostrarHistorial: boolean = false;

  constructor(
    private corteDiarioService: CorteDiarioService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  buscarCorteDiario() {
    if (!this.corteStreamCodigo.trim()) {
      this.corteDiario = null;
      this.ultimoStreamConsultado = '';
      return;
    }
    this.ultimoStreamConsultado = this.corteStreamCodigo.trim();
    this.cargarCorteDiario();
    if (this.corteInterval) clearInterval(this.corteInterval);
    this.corteInterval = setInterval(() => this.cargarCorteDiario(), 2000);
  }

  cargarCorteDiario() {
  if (!this.ultimoStreamConsultado) {
    this.corteDiario = null;
    return;
  }
  this.corteDiarioService.getCorteDiario(this.ultimoStreamConsultado).subscribe((data: any) => {
    this.corteDiario = data;
    // Guardar el corte diario en el backend
    this.corteDiarioService.guardarCorteDiario(this.ultimoStreamConsultado, data).subscribe();
  });
}
get cortesPaginados() {
  const inicio = (this.paginaHistorial - 1) * this.cortesPorPagina;
  return this.historialCortes.slice(inicio, inicio + this.cortesPorPagina);
}

totalPaginasHistorial(): number {
  return Math.ceil(this.historialCortes.length / this.cortesPorPagina);
}

cambiarPaginaHistorial(delta: number) {
  const nuevaPagina = this.paginaHistorial + delta;
  if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginasHistorial()) {
    this.paginaHistorial = nuevaPagina;
  }
}

cargarHistorialCortes() {
  if (!this.ultimoStreamConsultado) {
    this.historialCortes = [];
    this.mostrarHistorial = false;
    return;
  }
  if (!this.mostrarHistorial) {
    this.corteDiarioService.getHistorialCortes(this.ultimoStreamConsultado).subscribe((data: any[]) => {
      this.historialCortes = data;
      this.paginaHistorial = 1;
      this.mostrarHistorial = true;
    });
  } else {
    this.mostrarHistorial = false;
  }
}

volverInicio() {
  this.router.navigate(['/Admin']);
}

  ngOnDestroy(): void {
    if (this.corteInterval) clearInterval(this.corteInterval);
  }
}