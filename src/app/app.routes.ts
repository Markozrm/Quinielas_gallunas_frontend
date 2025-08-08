import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'retirar-saldo',
    loadComponent: () => import('./retirar-saldo/retirar-saldo.component').then(c => c.RetirarSaldoComponent)
  },
  {
    path: 'ver-retiros',
    loadComponent: () => import('./ver-retiros/ver-retiros.component').then(c => c.VerRetirosComponent)
  },
  {
    path: 'historial-retiros',
    loadComponent: () => import('./historial-retiros/historial-retiros.component').then(c => c.HistorialRetirosComponent)
  }
]; 