import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { DEFAULT_HOME_APPEARANCE } from '../../models/home-appearance';
import { BoardService } from '../../services/board.service';
import { HomePageComponent } from './home-page';
import { SiteNavigationComponent } from '../../components/site-navigation/site-navigation';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import type { AuthUser } from '../../models/auth';

describe('Home and shared navigation', () => {
  let user: BehaviorSubject<AuthUser | null>;
  beforeEach(() => {
    user = new BehaviorSubject<AuthUser | null>(null);
    TestBed.configureTestingModule({ imports: [HomePageComponent], providers: [
      provideRouter([]), provideHttpClient(),
      { provide: AuthService, useValue: { user$: user, getAccessToken: () => '', signout: () => { user.next(null); return of(undefined); } } },
    ] });
    vi.spyOn(TestBed.inject(BoardService), 'getHomeAppearance').mockReturnValue(of({ ...DEFAULT_HOME_APPEARANCE }));
  });
  it('shows visitor onboarding and one complete bottom navigation', () => {
    const fixture = TestBed.createComponent(HomePageComponent); fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Make yourself');
    expect(element.querySelector('.home-cta')?.getAttribute('href')).toBe('/signin?mode=signup');
    expect(element.querySelectorAll('nav[aria-label="Main navigation"]')).toHaveLength(1);
    for (const label of ['Home', 'Search', 'Account', 'About BlueBerry']) {
      expect(element.querySelectorAll(`button[aria-label="${label}"]`)).toHaveLength(1);
    }
    expect(element.querySelector('.home-header button[aria-label="About BlueBerry"]')).not.toBeNull();
    expect(element.querySelector('.bottom-actions .toolbar-wordmark')).toBeNull();
    expect(element.querySelector('.navigation-context')?.textContent).toContain('Home');
    element.querySelector<HTMLButtonElement>('button[aria-label="Account"]')!.click(); fixture.detectChanges();
    expect(element.querySelector('.account-link')?.textContent).toContain('Sign In');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); fixture.detectChanges();
    expect(element.querySelector('.account-menu')).toBeNull();
  });
  it('tracks only the active Search or Account icon while its panel is open', () => {
    const fixture = TestBed.createComponent(HomePageComponent); fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('app-user-search dialog') as HTMLDialogElement;
    dialog.show = () => { dialog.open = true; };
    dialog.close = () => { dialog.open = false; };
    const nav = element.querySelector('.bottom-actions-left')!;
    element.querySelector<HTMLButtonElement>('button[aria-label="Search"]')!.click(); fixture.detectChanges();
    expect(nav.getAttribute('data-active-panel')).toBe('search');
    element.querySelector<HTMLButtonElement>('button[aria-label="Account"]')!.click(); fixture.detectChanges();
    expect(dialog.open).toBe(false); expect(nav.getAttribute('data-active-panel')).toBe('account');
    element.querySelector<HTMLButtonElement>('button[aria-label="Account"]')!.click(); fixture.detectChanges();
    expect(nav.hasAttribute('data-active-panel')).toBe(false);
  });
  it('replaces visitor onboarding with the signed-in activity empty state', () => {
    const fixture = TestBed.createComponent(HomePageComponent); fixture.detectChanges();
    user.next({ id: 'owner', username: 'owner', email: 'owner@example.com', role: 'USER' } as AuthUser);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.home-intro')).toBeNull();
    expect(fixture.nativeElement.querySelector('.home-header-brand')?.textContent).toBe('BlueBerry');
    expect(fixture.nativeElement.querySelector('.home-heading')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/settings"]')).toBeNull();
    expect(fixture.nativeElement.querySelector(fixture.componentInstance.showPreview ? 'app-home-feed-preview' : '.feed-empty')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Sample activity');
    expect(fixture.nativeElement.querySelector('.app-page').dataset.theme).toBe('default');
  });
  it('persists only the viewer’s Home appearance and resets it when signing out', () => {
    const service = TestBed.inject(BoardService);
    vi.mocked(service.getHomeAppearance).mockReturnValue(of({ ...DEFAULT_HOME_APPEARANCE, radiusStep: 3, spacingStep: 1, themeFamily: 'kiwi' }));
    const save = vi.spyOn(service, 'updateHomeAppearance').mockImplementation(value => of(value));
    const fixture = TestBed.createComponent(HomePageComponent); fixture.detectChanges();
    user.next({ id: 'owner', username: 'owner' } as AuthUser); fixture.detectChanges();
    expect(fixture.componentInstance.appearance()).toEqual(expect.objectContaining({ radiusStep: 3, spacingStep: 1, themeFamily: 'kiwi' }));
    expect(fixture.nativeElement.querySelector('.app-page').dataset.theme).toBe('kiwi');
    fixture.nativeElement.querySelector('.home-settings-button').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.home-settings input[type="range"]')).toHaveLength(2);
    fixture.componentInstance.saveAppearance({ ...fixture.componentInstance.appearance(), spacingStep: 3 }); fixture.detectChanges();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ radiusStep: 3, spacingStep: 3, themeFamily: 'kiwi' }));
    expect(fixture.nativeElement.querySelector('.home-stage').style.getPropertyValue('--feed-gap')).toBe('24px');
    fixture.nativeElement.querySelector('[data-theme-option="aqua"]').click(); fixture.detectChanges();
    expect(fixture.componentInstance.appearance().themeFamily).toBe('aqua');
    expect(fixture.nativeElement.querySelector('.app-page').dataset.theme).toBe('aqua');
    user.next(null); fixture.detectChanges();
    expect(fixture.componentInstance.appearance()).toEqual(DEFAULT_HOME_APPEARANCE);
    expect(fixture.nativeElement.querySelector('.home-settings')).toBeNull();
  });
  it('previews slider changes live without saving until release and restores the saved value on failure', () => {
    const save = vi.spyOn(TestBed.inject(BoardService), 'updateHomeAppearance').mockReturnValue(throwError(() => new Error('Unavailable')));
    const fixture = TestBed.createComponent(HomePageComponent);
    user.next({ id: 'owner' } as AuthUser); fixture.detectChanges();
    fixture.nativeElement.querySelector('.home-settings-button').click(); fixture.detectChanges();
    const slider = fixture.nativeElement.querySelector('input[aria-label="Corner"]') as HTMLInputElement;
    for (const [level, inset] of [[1, 8], [2, 10], [3, 12], [4, 16], [5, 20]]) {
      slider.value = String(level); slider.dispatchEvent(new Event('input')); fixture.detectChanges();
      expect(save).not.toHaveBeenCalled(); expect(slider.disabled).toBe(false);
      expect(fixture.nativeElement.querySelector('.home-stage').style.getPropertyValue('--feed-detail-inset')).toBe(inset + 'px');
    }
    expect(fixture.nativeElement.querySelector('.home-stage').style.getPropertyValue('--board-widget-radius')).toBe('48px');
    slider.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(save).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('.home-stage').style.getPropertyValue('--board-widget-radius')).toBe('12px');
  });
  it('restores the saved appearance and shows an error if an update fails', () => {
    vi.spyOn(TestBed.inject(BoardService), 'updateHomeAppearance').mockReturnValue(throwError(() => new Error('Unavailable')));
    const fixture = TestBed.createComponent(HomePageComponent);
    user.next({ id: 'owner' } as AuthUser); fixture.detectChanges();
    fixture.componentInstance.saveAppearance({ ...fixture.componentInstance.appearance(), radiusStep: 3 });
    expect(fixture.componentInstance.appearance().radiusStep).toBe(2);
    expect(fixture.componentInstance.error()).toBeTruthy();
    expect(fixture.componentInstance.saving()).toBe(false);
  });
  it('checks pending board edits before signing out and changing the session', () => {
    const fixture = TestBed.createComponent(SiteNavigationComponent);
    const signout = vi.spyOn(TestBed.inject(AuthService), 'signout');
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentRef.setInput('beforeSignOut', () => false);
    fixture.componentInstance.signOut();
    expect(signout).not.toHaveBeenCalled();
    fixture.componentRef.setInput('beforeSignOut', () => true);
    fixture.componentInstance.signOut();
    expect(signout).toHaveBeenCalledOnce();
  });

});
