import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Widget } from '../../models/widget';
import { BoardStoreService } from '../../services/board-store.service';

@Component({
  selector: 'app-admin-settings-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-settings-widget.html',
  styleUrl: './admin-settings-widget.css',
})
export class AdminSettingsWidgetComponent implements OnInit {
  @Input({ required: true }) widget!: Widget;

  readonly boards$;

  constructor(private boardStore: BoardStoreService) {
    this.boards$ = this.boardStore.boards$;
  }

  ngOnInit() {
    this.boardStore.refreshBoards();
  }
}
