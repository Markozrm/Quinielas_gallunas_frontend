import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';

interface UserComparison {
  usuario: string;
  saldoInicio: number;
  saldoFinal: number;
  "Gana/Pierde": string;
  diferencia: number;
  resultadoEsperado: number;
  totalCazado: number;
  totalGanado: number;
  totalPerdido: number;
  comisionPagada: number;
  discrepancia: number;
  timestampInicio: string | null;
  timestampFinal: string;
}

interface ComparisonResponse {
  comparaciones: UserComparison[];
  metadata: {
    totalInicio: number;
    totalFinal: number;
    totalApuestas: number;
    usuariosConApuestas: number;
  };
}

@Component({
  selector: 'app-screenshots',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './screenshot.component.html',
  styleUrls: ['./screenshot.component.css']
})
export class ScreenshotsComponent {
  ronda: string = ''; 
  codigoStream: string = '';
  userComparisons: UserComparison[] = [];
  metadata: any = null;
  loading: boolean = false;
  error: string = '';

  constructor(private http: HttpClient) {}

  buscarScreenshots() {
    if (!this.ronda.trim()) {
      this.error = 'Por favor ingresa un código de ronda';
      return;
    }

    if (!this.codigoStream.trim()) {
      this.error = 'Por favor ingresa un código de stream';
      return;
    }

    this.loading = true;
    this.error = '';
    
    // Use the new comparison endpoint
    this.http.get<ComparisonResponse>(`${environment.apiUrl}:444/api/screenshot/comparacion-completa/${this.codigoStream}/${this.ronda}`)
      .subscribe({
        next: (data) => {
          this.userComparisons = data.comparaciones;
          this.metadata = data.metadata;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar la comparación. Por favor intenta nuevamente.';
          this.loading = false;
          console.error('Error:', err);
        }
      });
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString("es-ES", { timeZone: 'America/Mexico_City' });
  }

  getTotalInitialBalance(): number {
    return this.metadata?.totalInicio || 0;
  }

  getTotalFinalBalance(): number {
    return this.metadata?.totalFinal || 0;
  }

  getTotalDifference(): number {
    return this.getTotalFinalBalance() - this.getTotalInitialBalance();
  }

  getTotalExpectedResult(): number {
    return this.userComparisons.reduce((total, comparison) => total + comparison.resultadoEsperado, 0);
  }

  getTotalDiscrepancy(): number {
    return this.userComparisons.reduce((total, comparison) => total + comparison.discrepancia, 0);
  }

  getTotalBetAmount(): number {
    return this.userComparisons.reduce((total, comparison) => total + comparison.totalCazado, 0);
  }

  getTotalWon(): number {
    return this.userComparisons.reduce((total, comparison) => total + comparison.totalGanado, 0);
  }

  getTotalLost(): number {
    return this.userComparisons.reduce((total, comparison) => total + comparison.totalPerdido, 0);
  }

  getTotalCommission(): number {
    return this.userComparisons.reduce((total, comparison) => total + comparison.comisionPagada, 0);
  }

  isDiscrepancySignificant(discrepancia: number): boolean {
    return Math.abs(discrepancia) >= 0.01;
  }

  getDiscrepancyClass(discrepancia: number): string {
    if (!this.isDiscrepancySignificant(discrepancia)) return 'exact';
    return discrepancia > 0 ? 'positive' : 'negative';
  }
}