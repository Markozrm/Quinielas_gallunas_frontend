import { Component, EventEmitter, Output,Input } from '@angular/core';

@Component({
  selector: 'app-close-bet-modal',
  templateUrl: './close-bet-modal.component.html',
  styleUrls: ['./close-bet-modal.component.css'],
  standalone: true,
  imports: [],
})
export class CloseBetModalComponent {
  @Output() onCloseBets = new EventEmitter<string>();
  @Output() onClose = new EventEmitter<void>();
  
  @Input() numeroPelea: number = 0; 
  selectedWinner: string | null = null;

  selectWinner(winner: string) {
    this.selectedWinner = winner;
  }

  closeBets() {
    
    this.onCloseBets.emit();
    
  }

  closeModal() {
    this.onClose.emit();
  }
}