import { Component } from '@angular/core';
import { Pm2Service } from '../services/pm2.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-stream-control',
  templateUrl: './reiniciar-server.component.html',
  styleUrls: ['./reiniciar-server.component.css'],
  standalone: true,
  imports: [],
})
export class StreamControlComponent {
  constructor(private pm2Service: Pm2Service, private router: Router) { }

  restartStream(id: string): void {
    this.pm2Service.restartProcess(id).subscribe({
      next: response => alert(`Stream ${id} restarted successfully`),
      error: err => console.error(`Failed to restart stream ${id}:`, err)
    });
  }

  goToAdminPanel() {
    this.router.navigate(['/Admin']);
  }
}
