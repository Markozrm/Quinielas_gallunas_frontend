import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private booleanState = new BehaviorSubject<boolean>(false);
  currentBooleanState = this.booleanState.asObservable();

  constructor() { }

  changeBooleanState(newState: boolean) {
    this.booleanState.next(newState);
  }
}
