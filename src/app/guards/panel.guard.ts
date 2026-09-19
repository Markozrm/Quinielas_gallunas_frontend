import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class PanelGuard implements CanActivate {

  // Rutas permitidas para el usuario dedicado al stream (QUINIELASTREAM
  // o cualquier usuario con rol 'streamer'): solo puede llegar al panel admin
  // y a las pantallas de stream.
  private readonly streamOnlyAllowedPaths = new Set<string>([
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
    const username = (localStorage.getItem('nombreUsuario') || '').toLowerCase();
    const path = route.routeConfig?.path || '';

    // Rol 'streamer': acceso permitido, pero SOLO a las rutas de stream.
    if (rol === 'streamer') {
      if (!this.streamOnlyAllowedPaths.has(path)) {
        this.router.navigate([`/Admin`]);
        return false;
      }
      return true;
    }

    const esSuperAdmin = rol === 'superUsuario' || rol === 'administrador' || rol === 'controladorBanca';
    if (!esSuperAdmin) {
      return false;
    }

    // Restricción específica del usuario QUINIELASTREAM (mismo criterio que
    // el rol 'streamer', pero por username porque fue configurado antes de
    // existir el rol): solo puede acceder a las rutas de stream.
    if (username === 'quinielastream') {
      if (!this.streamOnlyAllowedPaths.has(path)) {
        this.router.navigate([`/Admin`]);
        return false;
      }
    }

    return true;
  }
}
