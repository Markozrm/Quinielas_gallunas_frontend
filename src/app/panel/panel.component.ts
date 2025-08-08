import { MenuComponent } from '../menu/menu.component';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../chat/services/chat.service';
import { UsersChatComponent } from '../chat/components/users-chat/users-chat.component';
import { UsersRoomsComponent } from '../chat/components/users-rooms/users-rooms.component';
import { UntypedFormControl, UntypedFormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsersTypeComponent } from '../chat/components/users-type/users-type.component';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { UsersService } from 'src/app/services/users.service';
import { CommonModule } from '@angular/common';
@Component({
    selector: 'app-panel-page',
    templateUrl: './panel.component.html',
    styleUrls: ['./panel.component.css'],
    standalone: true,
    imports: [UsersRoomsComponent,CommonModule, UsersChatComponent,MenuComponent,UsersTypeComponent,ReactiveFormsModule],
})
export class PanelComponent implements OnInit {
  public formFiltro = new UntypedFormGroup({
    message: new UntypedFormControl('')
  });

  constructor(private usersService: UsersService,
    private route: ActivatedRoute,private router: Router,
    private chatService: ChatService
  ) {}
  public variableValue = '';
  ngOnInit(): void {
    this.route.params.subscribe( params=> {//TODO js, ts, node
    
      this.chatService.leaveRoom();
      this.chatService.initChat();
      console.log(this.variableValue);
      const username:string= localStorage.getItem("nombreUsuario") || "";
      this.chatService.joinRoom(this.variableValue,username); //voy a trtar de usar solo un canal
    }); //voy a trtar de usar solo un 
  }
  isSidebarOpen = false;
  username: string = localStorage.getItem('nombreUsuario') ?? '';
  userPhoto: string = this.getImage(this.username);

  public getImage(username: string): any {

    return this.usersService.getImageUrl(username);
  }

  userService = inject(UsersService);
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
    // Puedes agregar lógica para cerrar la sesión aquí si es necesario
  }
  logout() {
    // Lógica para cerrar sesión, por ejemplo, limpiar tokens y redirigir a la página de inicio de sesión.
    // Aquí también puedes agregar la lógica para limpiar cualquier otro dato que necesites.
    localStorage.removeItem('tokenLogin');
    localStorage.removeItem('nombreUsuario');
    const userParam = this.route.snapshot.paramMap.get('sala');
    // Navigate to the dynamic route based on the 'user' parameter

    this.router.navigate([`/Login/${userParam}`]);
    // Otra lógica de cierre de sesión que puedas necesitar...
  }
  inicio(){
    this.router.navigate([`/`]);
  }
  filtrar(){
    const { message } = this.formFiltro.value;
    this.chatService.leaveRoom();
      this.chatService.initChat();
      const username:string= localStorage.getItem("nombreUsuario") || "";
      this.chatService.joinRoom(message,username); //voy a trtar de usar solo un canal
    
  }
  volver(){
    this.router.navigate([`/Admin`]);
  }

}
