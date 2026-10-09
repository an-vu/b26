import { Component, input, output, afterNextRender, inject, ElementRef, DestroyRef } from '@angular/core';
import { WidgetHostComponent } from '../../../widgets/widget-host/widget-host';
import { IconComponent } from '../../../components/icon/icon';
import type { Widget } from '../../../models/widget';

@Component({
  selector: 'app-widget-library', standalone: true, imports: [WidgetHostComponent, IconComponent],
  templateUrl: './widget-library.html', styleUrl: './widget-library.css',
})
export class WidgetLibraryComponent {
  readonly disabled = input(false);
  readonly selectWidget = output<{ type: 'link' | 'embed' | 'map'; origin: DOMRect }>();
  readonly widgets: (Widget & { type: 'link' | 'embed' | 'map' })[] = ['link', 'embed', 'map'].map((type, index) => ({
    id: -(index + 1), type: type as 'link' | 'embed' | 'map',
    title: type[0].toUpperCase() + type.slice(1), layout: 'span-1', config: {}, enabled: true, order: index,
  }));

  constructor() {
    const host: HTMLElement = inject(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const page = host.closest('.page');
      const grid = page?.querySelector<HTMLElement>('.board-grid');
      if (!grid || !page) return;
      const matchSquareSize = () => {
        const rect = host.getBoundingClientRect();
        host.style.setProperty('--library-exit-offset', `${rect.top - (host.parentElement?.getBoundingClientRect().top ?? 0)}px`);
        host.style.setProperty('--library-exit-width', `${rect.width}px`);
        host.style.setProperty('--library-exit-height', `${rect.height}px`);
        // Read the rendered grid column; the board remains the source of sizing math.
        const size = Number.parseFloat(getComputedStyle(grid).gridTemplateColumns);
        if (size > 0) host.style.setProperty('--library-square-size', `${size}px`);
      };
      const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(matchSquareSize);
      resize?.observe(grid);
      resize?.observe(host);
      const appearance = new MutationObserver(matchSquareSize);
      appearance.observe(page, { attributes: true, attributeFilter: ['style'] });
      matchSquareSize();
      destroyRef.onDestroy(() => { resize?.disconnect(); appearance.disconnect(); });
    });
  }

  choose(type: 'link' | 'embed' | 'map', event: MouseEvent) {
    if (!this.disabled()) this.selectWidget.emit({ type, origin: (event.currentTarget as HTMLElement).getBoundingClientRect() });
  }
}
