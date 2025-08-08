import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatAdminPageComponent } from './pages_admin/chat-page.component';
//import { loginGuard } from '../guards/login.guard';

const routes: Routes = [
  {
    path: '',
    component: ChatAdminPageComponent,
  },

  {
    path: 'chat/:id',
    component: ChatAdminPageComponent,

  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChatAdminRoutingModule {}
