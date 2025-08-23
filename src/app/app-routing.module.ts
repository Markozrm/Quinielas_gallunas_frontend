import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { LoginGuard } from './guards/login.guard';
import { AppComponent } from './app.component';
import { IndexComponent } from './index/index.component';
import { RegisterComponent } from './Register/register.component';
import {ActivatedRouteSnapshot} from '@angular/router';
import { PanelComponent } from './panel/panel.component';
import { PanelGuard } from './guards/panel.guard';
import { AdminComponent } from './admin/admin.component';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { IniciardorStreamsComponent } from './iniciardor-streams/iniciardor-streams.component';
import { VideoListComponent } from './videos/videos.component';
import { VideoStreamComponent } from './video-palyer/video-stream.component';
import { StreamControlComponent } from './reiniciar-server/reiniciar-server.component'
import { PagoPageComponent } from './pago-page/pago-page.component';
import { EnviarReciboComponent } from './enviar-recibo/enviar-recibo.component';
import { RegisterInvitadoComponent } from './Register-invitado/register.component';
import { VerReciboComponent } from './ver-recibo/ver-recibo.component';
import { ApuestasStreamComponent } from './apuestas-stream/apuestas-stream.component';
import { MiPerfilComponent } from './mi-perfil/mi-perfil.component';
import { RetirarSaldoComponent } from './retirar-saldo/retirar-saldo.component';
import { VerRetirosComponent } from './ver-retiros/ver-retiros.component';
import { PaymentInitializeComponent } from './payment-initialize/payment-initialize.component';
import { VerHistorialUsuariosComponent } from './ver-historial-usuarios/historial.component';
import { ChangePasswordComponent } from './cambiar-contraseña/change-password.component';
import { ScreenshotsComponent } from './screenshots/screenshot.component.';
import { HistorialSaldosComponent } from './historial-saldos/historial-saldos.component';
import { RifaPageComponent } from './chat/components/quiniela/rifa.component'; // <-- agrega este import arriba
import { RuletaComponent } from './ruleta-admin/ruleta';
import { CorteDiarioComponent } from './Corte-Diario/corte-diario.component';
import { CodigoIngresoComponent } from './codigo-ingreso/codigo-ingreso.component';
const routes: Routes = [
  {
    path: '',
    component: LoginComponent
  },
  {
    path: 'Inicio',
    component: IndexComponent
  },
  {
    path: 'Admin',
    component:AdminComponent,
    canActivate:[PanelGuard]
    // loadChildren: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'Usuarios',
    component:UsuariosComponent,
    canActivate:[PanelGuard]
    // loadChildren: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'IniciarStream',
    component:IniciardorStreamsComponent,
    canActivate:[PanelGuard]
    // loadChildren: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'Reiniciar',
    component:StreamControlComponent,
    canActivate:[PanelGuard]
    // loadChildren: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'Panel',
    component:PanelComponent,
    canActivate:[PanelGuard]
  },
   {
    path: 'Screenshots',
    component: ScreenshotsComponent,
    canActivate: [PanelGuard]
  },
  {
    path: 'historial-saldos',
    component: HistorialSaldosComponent,
    canActivate: [PanelGuard]
  },
    { 
      path: 'cambiar-contrasena', component: ChangePasswordComponent 
    },
  {
    path: 'Register',
    component:RegisterComponent
  
  },
  {
    path: 'RegistroInvitado',
    component:RegisterInvitadoComponent
  },
    {
    path: 'RegistroInvitado/:sala/:port',
    component:RegisterInvitadoComponent
    // loadChildren: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'video/:folder/:name',
    component: VideoStreamComponent

  },
  {
    path: 'Videos',
    component: VideoListComponent

  },
  {
    path: 'Login',
    component:LoginComponent
 
  },
  {
    path: 'Login/:sala/:port',
    component:LoginComponent
    // loadChildren: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'recargar',
    component:PagoPageComponent
  
  },
  {
    path: 'Subir-recibo',
    component: EnviarReciboComponent

  },
  {
    path: 'Ver-recibos',
    component: VerReciboComponent

  },
  {
    path: 'Ver-apuestas',
    component: ApuestasStreamComponent
  },
  {
    path: 'mi-perfil',
    component: MiPerfilComponent,
    canActivate:[LoginGuard]
  },
  {
    path: 'retirar-saldo',
    component: RetirarSaldoComponent
  },
  {
    path: 'ver-retiros',
    component: VerRetirosComponent
  },
  {
    path: 'initialize-payment',
    component: PaymentInitializeComponent,
    canActivate:[PanelGuard]
  },
  {
    path: 'live/:sala/:port',
    canActivate:[LoginGuard],
    data: {
      guardSnapshot: ActivatedRouteSnapshot, // Pasa el ActivatedRouteSnapshot al guard
    },
    loadChildren: () => import('./chat/chat-invitado.module').then((m) => m.ChatInvitadoModule),
  },
  {
    path: 'live-inv/:sala/:port',
    canActivate:[LoginGuard],
    data: {
      guardSnapshot: ActivatedRouteSnapshot, // Pasa el ActivatedRouteSnapshot al guard
    },
    loadChildren: () => import('./chat/chat-invitado.module').then((m) => m.ChatInvitadoModule),
  },
    {
    path: 'historial-usuario/:username',
    component: VerHistorialUsuariosComponent,
    canActivate: [LoginGuard] // protegen que solamente usuarios logeados
  },
  {
    path: 'live-admin/:sala/:port',
    canActivate:[LoginGuard],
    data: {
      guardSnapshot: ActivatedRouteSnapshot, // Pasa el ActivatedRouteSnapshot al guard
    },
    loadChildren: () => import('./chat/chat-admin.module').then((m) => m.ChatAdminModule),
  },
  {
    path: 'rifa/:sala',
    component: RifaPageComponent
  },
  { 
    path: 'admin/ruleta', 
    component: RuletaComponent,
    canActivate: [PanelGuard] // Protege la ruta para que solo los administradores puedan acceder
  },
  {
  path: 'admin/corte',
  component: CorteDiarioComponent,
  canActivate: [PanelGuard]
},
{
  path: 'codigo-ingreso/:email',
  component: CodigoIngresoComponent
},
];

@NgModule({
  imports: [RouterModule.forRoot(routes),LoginComponent],
  exports: [RouterModule],
})
export class AppRoutingModule {}
