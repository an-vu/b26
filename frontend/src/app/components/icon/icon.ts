import { Component, ViewEncapsulation, input } from '@angular/core';

export type IconName = 'home' | 'search' | 'account' | 'insights' | 'settings' | 'trash' | 'boards' | 'minus' | 'heart' | 'comment' | 'more' | 'none' | 'stars' | 'dots' | 'snow' | 'grid' | 'rainfall' | 'sakura' | 'wave';
interface IconShape { tag: 'path' | 'circle' | 'rect'; d?: string; cx?: string; cy?: string; r?: string; x?: string; y?: string; width?: string; height?: string; rx?: string; opacity?: string; }
const ICONS: Record<IconName, readonly IconShape[]> = {
  home: [{"tag": "path", "d": "m3 10 9-7 9 7"}, {"tag": "path", "d": "M5 9v12h5v-7h4v7h5V9"}],
  search: [{"tag": "circle", "cx": "10", "cy": "10", "r": "6"}, {"tag": "path", "d": "m14.5 14.5 5 5"}],
  account: [{"tag": "circle", "cx": "12", "cy": "8", "r": "4"}, {"tag": "path", "d": "M4 21v-2a8 8 0 0 1 16 0v2"}],
  insights: [{"tag": "path", "d": "m4 18 6-6 4 3 6-9M15 6h5v5"}],
  settings: [{"tag": "path", "d": "m9 3-.5 2-2 1.2-2-.6-2 3.5L4 10.5v3L2.5 15l2 3.5 2-.6 2 1.2.5 2h4l.5-2 2-1.2 2 .6 2-3.5-1.5-1.5v-3L20.5 9l-2-3.5-2 .6-2-1.2L14 3Z"}, {"tag": "circle", "cx": "11.5", "cy": "12", "r": "3"}],
  trash: [{"tag": "path", "d": "M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"}],
  boards: [{"tag": "rect", "x": "7", "y": "4", "width": "10", "height": "16", "rx": "1.5"}, {"tag": "path", "d": "M4 6H2v12h2M20 6h2v12h-2"}],
  minus: [{"tag": "path", "d": "M6 12h12"}],
  heart: [{"tag": "path", "d": "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"}],
  comment: [{"tag": "path", "d": "M20 15a3 3 0 0 1-3 3H9l-5 3v-6a3 3 0 0 1-1-2V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3Z"}],
  more: [{"tag": "circle", "cx": "5", "cy": "12", "r": "1.6"}, {"tag": "circle", "cx": "12", "cy": "12", "r": "1.6"}, {"tag": "circle", "cx": "19", "cy": "12", "r": "1.6"}],
  none: [{"tag": "circle", "cx": "12", "cy": "12", "r": "7.5"}, {"tag": "path", "d": "m7 17 10-10"}],
  stars: [{"tag": "circle", "cx": "7", "cy": "8", "r": "1.3"}, {"tag": "circle", "cx": "16", "cy": "5", "r": ".6"}, {"tag": "circle", "cx": "15", "cy": "15", "r": "2"}, {"tag": "path", "d": "M5 17h.01M20 10h.01"}],
  dots: [{"tag": "circle", "cx": "7", "cy": "8", "r": "1.3"}, {"tag": "circle", "cx": "15", "cy": "15", "r": "2"}],
  snow: [{"tag": "path", "d": "M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 5l3 3 3-3M9 19l3-3 3 3M4.5 11l4-1-1-4M16.5 18l-1-4 4-1M4.5 13l4 1-1 4M16.5 6l-1 4 4 1"}],
  grid: [{"tag": "path", "opacity": ".4", "d": "M8 3v18M16 3v18M3 8h18M3 16h18"}, {"tag": "path", "d": "M3 8h5v8h8V3"}],
  rainfall: [{"tag": "path", "d": "m6 4-2 6m9-7-2 6m9-5-2 6M9 13l-2 7m9-7-2 7"}],
  sakura: [{"tag": "path", "d": "M12 12C5 14 3 8 7 5c4 0 7 3 5 7ZM12 12c1-6 6-7 8-3-1 4-4 5-8 3ZM12 12c5 2 5 7 1 9-4-2-5-6-1-9Z"}, {"tag": "path", "opacity": ".5", "d": "m6 19 2-2"}],
  wave: [{"tag": "path", "d": "M3 8c6-8 12 8 18 0M3 12c6-8 12 8 18 0M3 16c6-8 12 8 18 0"}],
};

@Component({
  selector: 'app-icon', standalone: true, encapsulation: ViewEncapsulation.None,
  template: `<svg viewBox="0 0 24 24" [attr.class]="'app-icon-svg ' + svgClass()" aria-hidden="true" focusable="false"
    [attr.fill]="name() === 'more' ? 'currentColor' : 'none'" [attr.stroke]="name() === 'more' ? 'none' : 'currentColor'"
    [attr.stroke-width]="strokeWidth()" stroke-linecap="round" stroke-linejoin="round">
    @for (shape of paths(); track $index) {
      @switch (shape.tag) {
        @case ('path') { <path [attr.d]="shape.d" [attr.opacity]="shape.opacity" /> }
        @case ('circle') { <circle [attr.cx]="shape.cx" [attr.cy]="shape.cy" [attr.r]="shape.r" /> }
        @case ('rect') { <rect [attr.x]="shape.x" [attr.y]="shape.y" [attr.width]="shape.width" [attr.height]="shape.height" [attr.rx]="shape.rx" /> }
      }
    }
    </svg>`,
  styles: ['app-icon { display: contents; } :where(.app-icon-svg) { display: block; width: var(--icon-size, 18px); height: var(--icon-size, 18px); flex: none; }'],
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly svgClass = input('');
  readonly strokeWidth = input(1.7);
  paths() { return ICONS[this.name()]; }
}
