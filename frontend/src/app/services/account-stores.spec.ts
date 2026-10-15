import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { BoardStoreService } from './board-store.service';
import { UserStoreService } from './user-store.service';
import { BoardService } from './board.service';
import type { Board, UserPreferences, UserProfile } from '../models/board';

const profile: UserProfile = { userId: 'alice', username: 'alice', displayName: 'Alice', email: null };
const preferences: UserPreferences = { userId: 'alice', username: 'alice', mainBoardId: 'one', mainBoardUrl: 'one' };
const board: Board = { id: 'one', boardUrl: 'one', boardName: 'One', name: 'Alice', headline: '' };

function inject<T>(store: new () => T, service: Partial<BoardService>): T {
  TestBed.configureTestingModule({ providers: [{ provide: BoardService, useValue: service }] });
  return TestBed.inject(store);
}

describe('Account store request lifetimes', () => {
  it('cancels superseded board requests and prevents late responses after clearing', () => {
    const old = new Subject<Board[]>();
    const latest = new Subject<Board[]>();
    const getMyBoards = vi.fn().mockReturnValueOnce(old).mockReturnValue(latest);
    const store = inject(BoardStoreService, { getMyBoards });
    store.refreshBoards(); store.refreshBoards();
    expect(old.observed).toBe(false);
    latest.next([board]);
    expect(store.boards()).toHaveLength(1);
    store.clearBoards();
    expect(latest.observed).toBe(false);
    old.next([board]); latest.next([board]);
    expect(store.boards()).toEqual([]);
  });

  it('applies a saved board locally without refetching the list', () => {
    const getMyBoards = vi.fn().mockReturnValue(new Subject<Board[]>());
    const store = inject(BoardStoreService, { getMyBoards });
    store.refreshBoards();
    (getMyBoards.mock.results[0].value as Subject<Board[]>).next([board]);
    store.updateBoardInStore({ ...board, boardName: 'Renamed' });
    expect(store.boards()[0].boardName).toBe('Renamed');
    expect(getMyBoards).toHaveBeenCalledOnce();
  });

  it('cancels profile, preference and profile-save responses on account reset', () => {
    const profileResponse = new Subject<UserProfile>();
    const preferenceResponse = new Subject<UserPreferences>();
    const profileSave = new Subject<UserProfile>();
    const store = inject(UserStoreService, {
      getMyProfile: () => profileResponse, getMyPreferences: () => preferenceResponse,
      updateMyProfile: () => profileSave,
    });
    store.refreshMyProfile(); store.refreshMyPreferences();
    store.updateMyProfile(profile).subscribe();
    profileResponse.next(profile); preferenceResponse.next(preferences);
    store.clearProfile();
    expect(profileResponse.observed || preferenceResponse.observed || profileSave.observed).toBe(false);
    profileResponse.next(profile); preferenceResponse.next(preferences); profileSave.next(profile);
    expect(store.profile()).toBeNull();
    expect(store.mainBoardId()).toBe('');
  });

  it('does not overwrite a newer main-board choice with an earlier preference refresh', () => {
    const response = new Subject<UserPreferences>();
    const store = inject(UserStoreService, { getMyPreferences: () => response });
    store.refreshMyPreferences(); store.setMainBoardId('new'); response.next(preferences);
    expect(store.mainBoardId()).toBe('new');
  });
});
