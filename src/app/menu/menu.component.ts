import { inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router'
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit {
  username: string = '';
  balance: number = 0;
  streamTitle: string = 'QUINIELAS GALLISTICAS'; // Default fallback
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  constructor(private usersService: UsersService) {
    // Ejemplo: obtener el nombre de usuario y saldo desde localStorage o servicio
    this.username = localStorage.getItem('nombreUsuario') || '';
    this.usersService.getSaldo(this.username).subscribe((data: any) => {
      this.balance = data.saldo;
    });
  }

  ngOnInit() {
    this.getStreamTitle();
  }

  getStreamTitle() {
    this.http.get<any>(`${this.apiUrl}/api/settings/title`).subscribe({
      next: (res) => {
        if (res && res.title) {
          this.streamTitle = res.title;
        }
      },
      error: (err) => console.error('Error fetching stream title:', err)
    });
  }
}

