import { Component, OnInit } from '@angular/core';
import { map } from 'rxjs/operators';
import { ChatService } from '../../services/chat.service';
import { RouterLinkActive, RouterLink } from '@angular/router';
import { NgFor, AsyncPipe } from '@angular/common';

@Component({
    selector: 'app-users-rooms',
    templateUrl: './users-rooms.component.html',
    styleUrls: ['./users-rooms.component.css'],
    standalone: true,
    imports: [
        NgFor,
        RouterLinkActive,
        RouterLink,
        AsyncPipe,
    ],
})
export class UsersRoomsComponent implements OnInit {
  public users$ = this.chatService.users$;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {}
}
