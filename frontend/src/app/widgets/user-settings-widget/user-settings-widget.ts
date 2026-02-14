import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Widget } from '../../models/widget';
import { BoardStoreService } from '../../services/board-store.service';

@Component({
  selector: 'app-user-settings-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-settings-widget.html',
  styleUrl: './user-settings-widget.css',
})
export class UserSettingsWidgetComponent implements OnInit {
  @Input({ required: true }) widget!: Widget;

  readonly boards$;

  constructor(private boardStore: BoardStoreService) {
    this.boards$ = this.boardStore.boards$;
  }

  ngOnInit() {
    this.boardStore.refreshBoards();
  }
}
