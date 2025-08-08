import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatInvitadoPageComponent } from './pages_invitado/chat-page.component';
//import { loginGuard } from '../guards/login.guard';

const routes: Routes = [
  {
    path: '',
    component: ChatInvitadoPageComponent,
  },

  {
    path: 'chat/:id',
    component: ChatInvitadoPageComponent,

  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChatInvitadoRoutingModule {}
