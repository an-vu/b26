import { WidgetBounceDirective } from '../../directives/widget-bounce';
import { Component, ViewEncapsulation } from '@angular/core';

/** Shared frame, hosted on the existing element to preserve dialog and dock behavior.
 * Consumers supply a heading, body content, and an optional [panelActions] slot.
 * Placement and widget-back geometry remain explicit variants.
 */
@Component({
  selector: '[appPanel]', standalone: true, imports: [WidgetBounceDirective],
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content select=".board-settings-heading" />
    <div class="panel-body"><div class="panel-scroll-content" appWidgetBounce><ng-content /></div></div>
    <footer class="panel-footer">
      <hr />
      <div class="panel-footer-actions"><ng-content select="[panelActions]" /></div>
    </footer>`,
  styleUrl: './panel.css',
})
export class PanelComponent {}
