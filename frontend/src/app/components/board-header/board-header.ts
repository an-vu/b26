import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-board-header',
  standalone: true,
  templateUrl: './board-header.html',
  styleUrl: './board-header.css',
})
export class BoardHeaderComponent {
  @Input({ required: true }) name!: string;
  @Input({ required: true }) headline!: string;
}
