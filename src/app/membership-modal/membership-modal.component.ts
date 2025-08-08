import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-membership-modal',
  templateUrl: './membership-modal.component.html',
  styleUrls: ['./membership-modal.component.css'],
  standalone:true,
  imports:[],
})
export class MembershipModalComponent {

  constructor(private router: Router){}

  @Output() closeModal = new EventEmitter<void>();

  onClose() {
    this.closeModal.emit();
  }
  confirmPurchase(){
    this.router.navigate(['/Subir-recibo']);
  }
}
