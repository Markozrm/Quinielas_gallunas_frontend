import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { UsersService } from '../services/users.service';
@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {

  constructor(private router: Router,private userService:UsersService) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    const userParam = route.params['sala'];
    const portParam = route.params['port'];
    const protectedRoute = route.routeConfig?.path; // Obtén la ruta protegida
    console.log('Ruta protegida:', userParam);
    
    if (localStorage.getItem('tokenLogin')) {
      if(await this.estaBaneado()){
        console.log('esta baneado::')
        this.router.navigate([`Login/${userParam}/${portParam}`]);
        return false;
      }
      else{
        return true
      }
    }else{
      this.router.navigate([`Login/${userParam}/${portParam}`]);
      return false;
    }
  }

  async estaBaneado(): Promise<boolean> {
    const username = localStorage.getItem('nombreUsuario') || '';
    console.log("nombre de usuario", username);
  
    return this.userService.checkBanStatus(username).then(response => {
      return response.isBanned;
    }).catch(error => {
      console.error('Error verificando el estado de baneo:', error);
      return false;  // Devuelve false en caso de error
    });
  }
}
