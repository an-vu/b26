import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { SiteThemeService } from './site-theme.service';
import { BERRY_APPEARANCE } from '../themes/appearance-values';
import { AuthService } from './auth.service';
import { BoardService } from './board.service';
import { BoardStoreService } from './board-store.service';
import { UserStoreService } from './user-store.service';
import type { AuthUser } from '../models/auth';
import type { BoardAppearance } from '../models/board';
import type { BoardThemeId } from '../themes/board-theme';

describe('Site theme', () => {
  let user: BehaviorSubject<AuthUser | null>;
  let home: Subject<BoardAppearance>;
  let auth: { user$: typeof user; getAccessToken: ReturnType<typeof vi.fn>; me: ReturnType<typeof vi.fn>; clearSession: ReturnType<typeof vi.fn> };
  let api: { getHomeAppearance: ReturnType<typeof vi.fn> };
  const account = { id: 'owner', username: 'owner', email: 'owner@example.com', role: 'USER' } as AuthUser;
  const kiwiHome: BoardAppearance = { ...BERRY_APPEARANCE, themeFamily: 'kiwi', theme: 'dark' };
  const aquaBoard: BoardAppearance = { ...BERRY_APPEARANCE, themeFamily: 'aqua', backgroundColor: '#3185fc' };

  beforeEach(() => {
    user = new BehaviorSubject<AuthUser | null>(null);
    home = new Subject<BoardAppearance>();
    auth = { user$: user, getAccessToken: vi.fn(() => ''), me: vi.fn(() => of({ user: account })), clearSession: vi.fn(() => user.next(null)) };
    api = { getHomeAppearance: vi.fn(() => home) };
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: auth },
      { provide: BoardService, useValue: api },
      { provide: UserStoreService, useValue: { refreshMyProfile: vi.fn(), refreshMyPreferences: vi.fn(), clearProfile: vi.fn(), mainBoardId: signal('') } },
      { provide: BoardStoreService, useValue: { boards: signal([]), clearBoards: vi.fn(), refreshBoards: vi.fn() } },
    ] });
  });

  it('uses Berry on app pages for signed-out visitors', () => {
    const theme = TestBed.inject(SiteThemeService);
    expect(theme.appearance()).toEqual(BERRY_APPEARANCE);
    expect(api.getHomeAppearance).not.toHaveBeenCalled();
  });

  it("uses the signed-in user's saved Home appearance on app pages like Settings and Insights", () => {
    const theme = TestBed.inject(SiteThemeService);
    user.next(account); home.next(kiwiHome);
    expect(api.getHomeAppearance).toHaveBeenCalledOnce();
    expect(theme.themeId()).toBe('kiwi'); expect(theme.colorMode()).toBe('dark');
    theme.savedHomeAppearance.set({ ...kiwiHome, themeFamily: 'omakase' });
    expect(theme.themeId()).toBe('omakase');
    theme.savedHomeAppearance.set({ ...kiwiHome, themeFamily: 'frutiger-aero' as BoardThemeId });
    expect(theme.themeId()).toBe('aero'); expect(theme.appearance().themeFamily).toBe('aero');
  });

  it("shows a board's own appearance while the board page holds it, for visitors too", () => {
    const theme = TestBed.inject(SiteThemeService), board = {};
    theme.showPageAppearance(board, aquaBoard);
    expect(theme.themeId()).toBe('aqua'); expect(theme.background()).toBe('#3185fc');
    user.next(account); home.next(kiwiHome);
    expect(theme.themeId()).toBe('aqua');
    theme.releasePageAppearance(board);
    expect(theme.themeId()).toBe('kiwi');
  });

  it("ignores a late release from a page that no longer owns the look", () => {
    const theme = TestBed.inject(SiteThemeService), homePage = {}, boardPage = {};
    theme.showPageAppearance(homePage, kiwiHome);
    theme.showPageAppearance(boardPage, aquaBoard);
    theme.releasePageAppearance(homePage);
    expect(theme.themeId()).toBe('aqua');
  });

  it('drops the previous account theme on sign-out and account changes', () => {
    const theme = TestBed.inject(SiteThemeService);
    user.next(account); home.next(kiwiHome);
    user.next({ ...account, id: 'another' });
    expect(theme.appearance()).toEqual(BERRY_APPEARANCE);
    home.next(kiwiHome); user.next(null);
    expect(theme.appearance()).toEqual(BERRY_APPEARANCE);
  });

  it('keeps Berry when the Home appearance fails to load', () => {
    api.getHomeAppearance.mockReturnValue(throwError(() => ({ status: 500 })));
    const theme = TestBed.inject(SiteThemeService);
    user.next(account);
    expect(theme.appearance()).toEqual(BERRY_APPEARANCE);
  });

  it('restores a stored session and clears expired credentials', () => {
    auth.getAccessToken.mockReturnValue('stored-session');
    auth.me.mockReturnValue(throwError(() => ({ status: 401 })));
    const theme = TestBed.inject(SiteThemeService);
    expect(auth.me).toHaveBeenCalledOnce(); expect(auth.clearSession).toHaveBeenCalledOnce();
    expect(theme.appearance()).toEqual(BERRY_APPEARANCE);
  });
});
