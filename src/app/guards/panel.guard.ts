import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class PanelGuard implements CanActivate {

  // Rutas permitidas para el usuario dedicado al stream (QUINIELASTREAM):
  // solo puede llegar al panel admin y a las pantallas de stream.
  private readonly quinielaStreamAllowedPaths = new Set<string>([
    'Admin',
    'IniciarStream',
    'iniciardor-streams',
    'apuestas-stream',
  ]);

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!localStorage.getItem('tokenLogin')) {
      this.router.navigate([`/`]);
      return false;
    }

    const rol = localStorage.getItem('Rol') || '';
    const esSuperAdmin = rol === 'superUsuario' || rol === 'administrador' || rol === 'controladorBanca';
    if (!esSuperAdmin) {
      return false;
    }

    // Restricción específica del usuario QUINIELASTREAM: solo puede acceder a
    // las rutas de la lista blanca (nada de registro, usuarios, PM2, etc.).
    const username = (localStorage.getItem('nombreUsuario') || '').toLowerCase();
    if (username === 'quinielastream') {
      const path = route.routeConfig?.path || '';
      if (!this.quinielaStreamAllowedPaths.has(path)) {
        this.router.navigate([`/Admin`]);
        return false;
      }
    }

    return true;
  }
}
