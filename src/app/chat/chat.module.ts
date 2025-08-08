import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChatRoutingModule } from './chat-routing.module';
import { UsersRoomsComponent } from './components/users-rooms/users-rooms.component';
import { UsersChatComponent } from './components/users-chat/users-chat.component';
import { ChatPageComponent } from './pages/chat-page.component';
import { UsersTypeComponent } from './components/users-type/users-type.component';
import { ChatModalComponent } from './components/chat-modal/chat-modal.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';



@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ChatRoutingModule,
        UsersRoomsComponent,
        UsersChatComponent,
        ChatPageComponent,
        UsersTypeComponent,
        ChatModalComponent,
     
    ]
})
export class ChatModule { }
