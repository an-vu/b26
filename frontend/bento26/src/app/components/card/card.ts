import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class CardComponent {
  @Input({ required: true }) href!: string;
  @Input({ required: true }) label!: string;
}
