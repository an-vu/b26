import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PanelBehaviorDirective, PanelDismissReason } from './panel-behavior';

@Component({
  imports: [PanelBehaviorDirective],
  template: `<div appPanelBehavior [panelOpen]="open()" [panelInternalView]="internal()" [panelBusy]="busy()" (panelDismiss)="dismiss($event)">
    <button>Open</button><section class="toolbar-panel">@if (internal()) { Confirmation } @else { Settings }</section>
  </div>`,
})
class PanelFixture {
  open = signal(true);
  internal = signal(false);
  busy = signal(false);
  reason?: PanelDismissReason;
  dismiss(reason: PanelDismissReason) { this.reason = reason; if (reason === 'back') this.internal.set(false); else this.open.set(false); }
}

describe('Shared toolbar panel behavior', () => {
  it('preserves height for internal views and Escape returns before closing', () => {
    const fixture = TestBed.createComponent(PanelFixture);
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.toolbar-panel') as HTMLElement;
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({ height: 280 } as DOMRect);
    fixture.componentInstance.internal.set(true);
    fixture.detectChanges();
    expect(panel.style.height).toBe('280px');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(true);
    expect(fixture.componentInstance.reason).toBe('back');
    expect(panel.style.height).toBe('');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('ignores inside clicks and dismisses outside clicks', () => {
    const fixture = TestBed.createComponent(PanelFixture);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    expect(fixture.componentInstance.open()).toBe(true);
    document.body.click();
    expect(fixture.componentInstance.reason).toBe('outside');
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('keeps a busy confirmation open on Escape and outside clicks', () => {
    const fixture = TestBed.createComponent(PanelFixture);
    fixture.componentInstance.busy.set(true);
    fixture.componentInstance.internal.set(true);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.body.click();
    expect(fixture.componentInstance.open()).toBe(true);
    expect(fixture.componentInstance.internal()).toBe(true);
    expect(fixture.componentInstance.reason).toBeUndefined();
  });
});
