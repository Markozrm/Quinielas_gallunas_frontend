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
import { QuinielaService } from './services/quiniela.service';
import { ChatService } from './chat/services/chat.service';
import { RuletaComponent } from './ruleta-admin/ruleta';
import { CodigoIngresoComponent } from './codigo-ingreso/codigo-ingreso.component';

const config: SocketIoConfig = { url: `${environment.apiUrl_chat}`, options: {
  transports: ['websocket'],
  upgrade: false,
  withCredentials: true

} };

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
    SocketIoModule.forRoot(config),
    CodigoIngresoComponent
  ],
  providers: [QuinielaService, ChatService],
  bootstrap: [AppComponent],
})
export class AppModule {}

