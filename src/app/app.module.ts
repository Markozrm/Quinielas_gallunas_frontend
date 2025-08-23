import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { ChangePasswordComponent } from './cambiar-contraseña/change-password.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { QuinielaModule } from './chat/quiniela.module';
import { QuinielaService } from './services/quiniela.service';
import { ChatService } from './chat/services/chat.service';
import { RuletaComponent } from './ruleta-admin/ruleta';
import { CodigoIngresoComponent } from './codigo-ingreso/codigo-ingreso.component';

const apiUrl = environment.apiUrl;
const Port = environment.PORT;
const config: SocketIoConfig = 
{ url:`${apiUrl}:${Port}`, options: {} };
//{ url:'http://localhost:81' , options: {} };
//{ url:`${apiUrl}:${Port}`, options: {} };



@NgModule({
  declarations: [AppComponent,ChangePasswordComponent, RuletaComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    QuinielaModule,
    SocketIoModule.forRoot(config),
    CodigoIngresoComponent
  ],
  providers: [QuinielaService, ChatService],
  bootstrap: [AppComponent],
})
export class AppModule {}

