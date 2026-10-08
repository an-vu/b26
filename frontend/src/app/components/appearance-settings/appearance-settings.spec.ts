import { TestBed } from '@angular/core/testing';
import { AppearanceSettingsComponent } from './appearance-settings';
import { BERRY_APPEARANCE } from '../../services/site-theme.service';
import type { BoardAppearance } from '../../models/board';

it('cycles the selected pattern intensity, resets all appearance fields, and ignores disabled edits', () => {
  const fixture = TestBed.createComponent(AppearanceSettingsComponent);
  const initial: BoardAppearance = { ...BERRY_APPEARANCE, themeFamily: 'aqua', theme: 'dark', spacingStep: 3 };
  fixture.componentRef.setInput('appearance', initial); fixture.detectChanges();
  const changes: BoardAppearance[] = [];
  fixture.componentInstance.appearanceChange.subscribe(value => {
    changes.push(value); fixture.componentRef.setInput('appearance', value);
  });
  for (const intensity of ['light', 'medium', 'heavy', 'light']) {
    fixture.nativeElement.querySelector('[data-pattern-option="snow"]').click(); fixture.detectChanges();
    expect(changes.at(-1)?.patternIntensity).toBe(intensity);
  }
  expect(initial.pattern).toBe('none');
  fixture.nativeElement.querySelector('.settings-reset').click(); fixture.detectChanges();
  expect(changes.at(-1)).toEqual(BERRY_APPEARANCE);
  fixture.componentRef.setInput('disabled', true); fixture.detectChanges();
  const count = changes.length;
  fixture.componentInstance.set('themeFamily', 'kiwi');
  fixture.componentInstance.selectPattern('stars');
  expect(changes).toHaveLength(count);
});
