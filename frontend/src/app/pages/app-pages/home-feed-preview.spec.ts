import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HomeFeedPreviewComponent } from './home-feed-preview';

it('shows an avatar with simple owner details and icon-only reactions without neighbor resizing', () => {
  TestBed.configureTestingModule({ imports: [HomeFeedPreviewComponent], providers: [provideHttpClient(), provideRouter([])] });
  const fixture = TestBed.createComponent(HomeFeedPreviewComponent); fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const tiles = Array.from(element.querySelectorAll<HTMLElement>('.feed-post'));
  expect(tiles[0].querySelector('.avatar')?.getAttribute('src')).toBe('/brand/avatar-placeholder.svg');
  expect(tiles[0].querySelector('.activity-identity')?.textContent).toContain('Emma');
  expect(tiles[0].querySelector('.activity-identity')?.textContent).toContain('@emma');
  expect(tiles[0].querySelector('.activity-time')?.textContent).toBe('9m ago');
  expect(element.querySelector('.activity-action')).toBeNull();
  const buttons = tiles[0].querySelectorAll<HTMLButtonElement>('.activity-footer button');
  expect(buttons).toHaveLength(2);
  expect(Array.from(buttons).every(button => button.disabled && button.querySelector('svg') && !button.textContent?.trim())).toBe(true);
  const neighborStyle = tiles[1].getAttribute('style');
  tiles[0].dispatchEvent(new Event('pointerenter')); fixture.detectChanges();
  expect(tiles[1].getAttribute('style')).toBe(neighborStyle);
  expect(tiles[0].style.getPropertyValue('--reveal-left')).toBe('');
});
