import { Component, Input } from '@angular/core';
import type { Card } from '../../models/profile';
import { CardComponent } from '../card/card';

@Component({
  selector: 'app-card-grid',
  standalone: true,
  imports: [CardComponent],
  templateUrl: './card-grid.html',
  styleUrl: './card-grid.css',
})
export class CardGridComponent {
  @Input({ required: true }) cards!: Card[];
}
