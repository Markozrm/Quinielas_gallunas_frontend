import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-choose-winner-modal',
  templateUrl: './choose-winner-modal.component.html',
  styleUrls: ['./choose-winner-modal.component.css'],
  standalone: true,
  imports: []
})
export class ChooseWinnerModalComponent {
  @Input() numeroPelea: number = 0;
  @Output() onCloseBets = new EventEmitter<string>();
  @Output() onClose = new EventEmitter<void>();

  selectedWinner: 'rojo' | 'verde' | 'empate' | null = null;

  selectWinner(winner: 'rojo' | 'verde' | 'empate') {
    this.selectedWinner = winner;
  }

  closeBets() {
    if (this.selectedWinner) {
      this.onCloseBets.emit(this.selectedWinner);
    }
  }

  closeModal() {
    this.onClose.emit();
  }
}