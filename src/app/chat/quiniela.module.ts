import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RifaPageComponent } from './components/quiniela/rifa.component';

@NgModule({
  declarations: [
    RifaPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  exports: [
    RifaPageComponent
  ]
})
export class QuinielaModule {}