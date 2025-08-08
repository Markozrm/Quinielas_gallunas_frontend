import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { Meta } from '@angular/platform-browser';
import { NgIf } from '@angular/common';

@Component({
    selector: 'app-users-type',
    templateUrl: './users-type.component.html',
    styleUrls: ['./users-type.component.css'],
    standalone: true,
    imports: [ReactiveFormsModule,NgIf],
})
export class UsersTypeComponent implements OnInit {
  @Input() isPrivate: boolean = false;
  @Input() targetUser: any = null;
  
  public formMessage = new UntypedFormGroup({
    message: new UntypedFormControl('')
  });
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;
  public image:File;
  public room:string = '';
  
  constructor(
    private chatService: ChatService,
    private route: ActivatedRoute,
    private meta: Meta
  ) {
    this.image = new File([], "empty.txt", { type: "text/plain" });
  }

  ngOnInit(): void {
    // Obtener el room de los parámetros de la ruta o usar un valor por defecto
    this.room = this.route.snapshot.paramMap.get('sala') || 'default';

    this.formMessage.patchValue({ room: this.room });
    console.log('room:',this.room);
    
    this.meta.updateTag({ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' });
  }

  ngAfterViewInit(): void {
    // Verificar que el fileInput se inicialice correctamente
    setTimeout(() => {
      if (this.esAdmin() && this.fileInput) {
        console.log('File input initialized for admin');
      }
    }, 100);
  }

  sendMessage(): void {
    try {
      const username:string = localStorage.getItem('nombreUsuario') || '----'
      console.log('Username:', username);
      console.log('Form message value:', this.formMessage.value);
      console.log('Is private chat:', this.isPrivate);
      console.log('Target user:', this.targetUser);
      
      if ((this.formMessage.value['message']  !== null)  && (this.formMessage.value['message']  !== '' ) || (this.image)){

        console.log('Message is valid, sending...');
        const { message} = this.formMessage.value;
        
        // Verificar si es chat privado
        if (this.isPrivate && this.targetUser) {
          console.log('Sending private message to:', this.targetUser.name);
          // Verificar si hay imagen para chat privado
          if (this.image && this.image.name !== 'empty.txt') {
            console.log('Sending private message with image');
            this.chatService.sendPrivateMessageWithImage(this.targetUser.name, message, this.image);
          } else {
            console.log('Sending private text message');
            this.chatService.sendPrivateMessage(this.targetUser.name, message);
          }
        } else {
          console.log('Sending public message');
          // Enviar mensaje con imagen si está disponible
          if (this.image && this.image.name !== 'empty.txt') {
            console.log('Sending message with image');
            this.chatService.sendMessageWithImage({ username, message,room:this.room },this.image);
          } else {
            console.log('Sending text message');
            this.chatService.sendMessage({ username, message,room:this.room });
          }
        }
        
        this.formMessage.controls['message'].reset();
        this.resetFileInput();
        this.image = new File([], "empty.txt", { type: "text/plain" });
      } else {
        console.log('Message is empty or invalid');
      }
    } catch (error) {
      console.error('Error en sendMessage:', error);
    }
  }

  selectFile() {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    } else {
      console.log("File input not available");
    }
  }

  private resetFileInput(): void {
    try {
      if (this.fileInput && this.fileInput.nativeElement) {
        this.fileInput.nativeElement.value = '';
      }
    } catch (error) {
      console.warn('Error resetting file input:', error);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.image = file;
      console.log('Archivo seleccionado:', file);
    }
  }

  esAdmin(): boolean {
    const rol = localStorage.getItem("Rol") || "";
    const esSuperAdmin = rol === 'superUsuario' || rol === 'administrador';
    return esSuperAdmin;
  }
}
