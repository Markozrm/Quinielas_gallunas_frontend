import { Component,EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
@Component({
  selector: 'app-open-bet-modal',
  templateUrl: './open-bet-modal.component.html',
  styleUrls: ['./open-bet-modal.component.css'],
  standalone: true,
  imports: [FormsModule],
})
export class OpenBetModalComponent {
  @Output() onOpenBets = new EventEmitter<{
    fightNumber: number,
    redTeamName: string,
    greenTeamName: string,
    redPoints: number,
    greenPoints: number
  }>();
  @Output() onClose = new EventEmitter<void>();

  fightNumber: number | null = null;
  redTeamName: string = '';
  greenTeamName: string = '';
  redPoints: number | null = null;
  greenPoints: number | null = null;

  openBets() {
    if (this.fightNumber == null || this.redTeamName == '' || this.greenTeamName == '' || 
        this.redPoints === null || this.greenPoints === null) {
      alert('Por favor, complete todos los campos antes de abrir las apuestas.');
      return;
    }
    
    this.onOpenBets.emit({
      fightNumber: this.fightNumber,
      redTeamName: this.redTeamName,
      greenTeamName: this.greenTeamName,
      redPoints: this.redPoints,
      greenPoints: this.greenPoints
    });
  }

  closeModal() {
    this.onClose.emit();
  }
}