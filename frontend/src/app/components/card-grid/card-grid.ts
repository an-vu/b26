import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Card } from '../../models/board';
import { CardComponent } from '../card/card';

@Component({
  selector: 'app-card-grid',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './card-grid.html',
  styleUrl: './card-grid.css',
})
export class CardGridComponent {
  @Input({ required: true }) cards!: Card[];
}
