import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PanelComponent } from './panel';

@Component({ standalone: true, imports: [PanelComponent], template: `
  <section appPanel class="utility-panel">
    <h2 class="board-settings-heading">Social</h2>
    <input aria-label="Social media link" />
    <button panelActions>Done</button>
  </section>` })
class TestPanel {}

it('projects the heading, body, and actions into one shared frame with one footer separator', () => {
  const fixture = TestBed.createComponent(TestPanel);
  fixture.detectChanges();
  const panel: HTMLElement = fixture.nativeElement.querySelector('section');
  expect(panel.querySelector(':scope > h2')?.textContent).toBe('Social');
  expect(panel.querySelector('.panel-body input')).not.toBeNull();
  expect(panel.querySelector('.panel-body button')).toBeNull();
  expect(panel.querySelector('.panel-footer button')?.textContent).toBe('Done');
  expect(panel.querySelectorAll('hr')).toHaveLength(1);
});
