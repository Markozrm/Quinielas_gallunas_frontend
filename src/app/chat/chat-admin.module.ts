import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChatAdminRoutingModule } from './chat-admin-routing.module';
import { UsersRoomsComponent } from './components/users-rooms/users-rooms.component';
import { UsersChatComponent } from './components/users-chat/users-chat.component';
import { ChatAdminPageComponent } from './pages_admin/chat-page.component';
import { UsersTypeComponent } from './components/users-type/users-type.component';
import { ChatModalComponent } from './components/chat-modal/chat-modal.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';



@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ChatAdminRoutingModule,
        UsersRoomsComponent,
        UsersChatComponent,
        ChatAdminPageComponent,
        UsersTypeComponent,
        ChatModalComponent,
     
    ]
})
export class ChatAdminModule { }
