import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatPageComponent } from './pages/chat-page.component';
//import { loginGuard } from '../guards/login.guard';

const routes: Routes = [
  {
    path: '',
    component: ChatPageComponent,
  },

  {
    path: 'chat/:id',
    component: ChatPageComponent,

  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChatRoutingModule {}
