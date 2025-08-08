import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChatInvitadoRoutingModule } from './chat-invitado-routing.module';
import { UsersRoomsComponent } from './components/users-rooms/users-rooms.component';
import { UsersChatComponent } from './components/users-chat/users-chat.component';
import { ChatInvitadoPageComponent } from './pages_invitado/chat-page.component';
import { UsersTypeComponent } from './components/users-type/users-type.component';
import { ChatModalComponent } from './components/chat-modal/chat-modal.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NotificacionPersonalComponent } from './components/notificacion-personal/notificacion-personal.component';



@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ChatInvitadoRoutingModule,
        UsersRoomsComponent,
        UsersChatComponent,
        ChatInvitadoPageComponent,
        UsersTypeComponent,
        ChatModalComponent,
        NotificacionPersonalComponent
    ]
})
export class ChatInvitadoModule { }
