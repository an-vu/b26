import { IconComponent, IconName } from '../icon/icon';
import { ChromeBlurService } from '../../services/chrome-blur.service';
import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { BoardAppearance } from '../../models/board';
import { BOARD_THEMES } from '../../themes/board-theme';
import { BOARD_PALETTE } from '../../themes/board-palette';
import { BERRY_APPEARANCE } from '../../services/site-theme.service';

@Component({
  selector: 'app-appearance-settings', standalone: true, imports: [IconComponent, CommonModule, FormsModule],
  templateUrl: './appearance-settings.html', styleUrl: './appearance-settings.css',
})
export class AppearanceSettingsComponent {
  readonly blur = inject(ChromeBlurService);
  readonly appearance = input.required<BoardAppearance>();
  readonly disabled = input(false);
  readonly showReset = input(true);
  readonly appearanceChange = output<BoardAppearance>();
  readonly appearancePreview = output<BoardAppearance>();
  readonly cornerLevels = [1, 2, 3, 4, 5];
  readonly gapLevels = [1, 2, 3];
  private readonly sliderDraft = signal<Partial<Record<'radiusStep' | 'spacingStep', number>>>({});
  sliderValue(field: 'radiusStep' | 'spacingStep') { return this.sliderDraft()[field] ?? this.appearance()[field] ?? 2; }
  cornerLabel(step: number) { return ['Small', 'Medium', 'Large', 'Rounder', 'Roundest'][step - 1]; }
  slide(field: 'radiusStep' | 'spacingStep', event: Event) {
    if (this.disabled()) return;
    const value = Number((event.target as HTMLInputElement).value);
    this.sliderDraft.update(draft => ({ ...draft, [field]: value }));
    this.appearancePreview.emit({ ...this.appearance(), [field]: value as BoardAppearance[typeof field] });
  }
  finishSlide(field: 'radiusStep' | 'spacingStep', event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    this.sliderDraft.update(draft => { const next = { ...draft }; delete next[field]; return next; });
    this.set(field, value as BoardAppearance[typeof field]);
  }
  readonly themes = BOARD_THEMES;
  readonly colors = BOARD_PALETTE;
  readonly patterns: (BoardAppearance['pattern'] & IconName)[] = ['none', 'stars', 'snow', 'grid', 'rainfall', 'sakura', 'wave', 'lava', 'bokeh'];
  readonly pickerHover: Record<string, string | null> = {};
  readonly pickerFocus: Record<string, string | null> = {};
  get selectedTheme() { return this.themes.find(theme => theme.id === this.appearance().themeFamily) ?? this.themes[0]; }
  get colorLabel() { return this.colors.find(color => color.value === this.appearance().backgroundColor)?.name ?? this.appearance().backgroundColor; }
  pickerLabel(section: string, selected: string) { return this.pickerHover[section] || this.pickerFocus[section] || selected; }
  sizeLabel(step: number) { return step === 1 ? 'Small' : step === 3 ? 'Large' : 'Medium'; }
  patternLabel(pattern: string) { return pattern === 'grid' ? 'Meteor' : pattern.charAt(0).toUpperCase() + pattern.slice(1); }
  set<K extends keyof BoardAppearance>(field: K, value: BoardAppearance[K]) {
    if (!this.disabled()) this.appearanceChange.emit({ ...this.appearance(), [field]: value });
  }
  selectPattern(pattern: BoardAppearance['pattern']) {
    if (this.disabled()) return;
    const current = this.appearance();
    const intensity = current.patternIntensity ?? 'light';
    const patternIntensity = pattern !== 'none' && pattern === current.pattern
      ? intensity === 'light' ? 'medium' : intensity === 'medium' ? 'heavy' : 'light' : 'light';
    this.appearanceChange.emit({ ...current, pattern, patternIntensity });
  }
  reset() { if (!this.disabled()) this.appearanceChange.emit({ ...BERRY_APPEARANCE }); }
}
