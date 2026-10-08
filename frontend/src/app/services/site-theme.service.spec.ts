import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { SiteThemeService, BERRY_APPEARANCE } from './site-theme.service';
import { AuthService } from './auth.service';
import { BoardStoreService } from './board-store.service';
import { UserStoreService } from './user-store.service';
import type { AuthUser } from '../models/auth';
import type { BoardIdentity } from '../models/board-identity';

describe('Site theme', () => {
  let user: BehaviorSubject<AuthUser | null>;
  let main: BehaviorSubject<string>;
  let boards: BehaviorSubject<BoardIdentity[]>;
  let auth: { user$: typeof user; getAccessToken: ReturnType<typeof vi.fn>; me: ReturnType<typeof vi.fn>; clearSession: ReturnType<typeof vi.fn> };
  let stores: { refreshMyProfile: ReturnType<typeof vi.fn>; refreshMyPreferences: ReturnType<typeof vi.fn>; clearProfile: ReturnType<typeof vi.fn> };
  const account = { id: 'owner', username: 'owner', email: 'owner@example.com', role: 'USER' } as AuthUser;
  const aqua = { id: 'main', boardName: 'Main', boardUrl: 'main', appearance: { ...BERRY_APPEARANCE, themeFamily: 'aqua' as const, theme: 'dark' as const } };

  beforeEach(() => {
    user = new BehaviorSubject<AuthUser | null>(null);
    main = new BehaviorSubject('');
    boards = new BehaviorSubject<BoardIdentity[]>([]);
    auth = { user$: user, getAccessToken: vi.fn(() => ''), me: vi.fn(() => of({ user: account })), clearSession: vi.fn(() => user.next(null)) };
    stores = { refreshMyProfile: vi.fn(), refreshMyPreferences: vi.fn(), clearProfile: vi.fn(() => main.next('')) };
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: auth },
      { provide: UserStoreService, useValue: { ...stores, mainBoardId$: main } },
      { provide: BoardStoreService, useValue: { boards$: boards, clearBoards: () => boards.next([]), refreshBoards: vi.fn() } },
    ] });
  });

  it('keeps signed-out visitors in Berry even when a visited board has another theme', () => {
    const theme = TestBed.inject(SiteThemeService);
    main.next('main'); boards.next([aqua]);
    expect(theme.appearance()).toEqual(BERRY_APPEARANCE);
  });

  it('follows only the signed-in main board and responds to appearance updates', () => {
    const theme = TestBed.inject(SiteThemeService);
    user.next(account); main.next('main'); boards.next([aqua]);
    expect(stores.refreshMyPreferences).toHaveBeenCalledOnce();
    expect(theme.themeId()).toBe('aqua'); expect(theme.colorMode()).toBe('dark');
    boards.next([aqua, { ...aqua, id: 'other', appearance: { ...BERRY_APPEARANCE, themeFamily: 'kiwi' } }]);
    expect(theme.themeId()).toBe('aqua');
    boards.next([{ ...aqua, appearance: { ...BERRY_APPEARANCE, themeFamily: 'kiwi' } }]);
    expect(theme.themeId()).toBe('kiwi');
    expect(theme.colorMode()).toBe('light');
    main.next(''); expect(theme.appearance()).toEqual(BERRY_APPEARANCE);
  });

  it('returns to Berry on logout and clears the previous account theme on account changes', () => {
    const theme = TestBed.inject(SiteThemeService);
    user.next(account); main.next('main'); boards.next([aqua]);
    user.next({ ...account, id: 'another' }); expect(theme.appearance()).toEqual(BERRY_APPEARANCE);
    main.next('main'); boards.next([aqua]); user.next(null);
    expect(theme.appearance()).toEqual(BERRY_APPEARANCE);
  });

  it('restores a stored session and clears expired credentials', () => {
    auth.getAccessToken.mockReturnValue('stored-session');
    auth.me.mockReturnValue(throwError(() => ({ status: 401 })));
    const theme = TestBed.inject(SiteThemeService);
    expect(auth.me).toHaveBeenCalledOnce(); expect(auth.clearSession).toHaveBeenCalledOnce();
    expect(theme.appearance()).toEqual(BERRY_APPEARANCE);
  });
  it('lets Home choose an independent theme and restores the main theme when leaving Home', () => {
    const theme = TestBed.inject(SiteThemeService);
    user.next(account); main.next('main'); boards.next([aqua]);
    theme.homeAppearance.set({ ...BERRY_APPEARANCE, themeFamily: 'kiwi' });
    expect(theme.themeId()).toBe('kiwi');
    boards.next([{ ...aqua, appearance: { ...BERRY_APPEARANCE, themeFamily: 'omahakase' } }]);
    expect(theme.themeId()).toBe('kiwi');
    theme.homeAppearance.set(null);
    expect(theme.themeId()).toBe('omahakase');
    theme.homeAppearance.set({ ...BERRY_APPEARANCE, themeFamily: 'kiwi' });
    user.next(null);
    expect(theme.appearance()).toEqual(BERRY_APPEARANCE);
  });
});
