import {inject } from '@angular/core';
import {Router,ActivatedRoute} from '@angular/router'

import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService } from '../services/users.service';
@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule ],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent {

}

