import { Subject } from 'rxjs';
import { BoardStoreService } from './board-store.service';
import { UserStoreService } from './user-store.service';
import { BoardService } from './board.service';
import type { Board, UserPreferences, UserProfile } from '../models/board';

const profile: UserProfile = { userId: 'alice', username: 'alice', displayName: 'Alice', email: null };
const preferences: UserPreferences = { userId: 'alice', username: 'alice', mainBoardId: 'one', mainBoardUrl: 'one' };
const board: Board = { id: 'one', boardUrl: 'one', boardName: 'One', name: 'Alice', headline: '' };

describe('Account store request lifetimes', () => {
  it('cancels superseded board requests and prevents late responses after clearing', () => {
    const old = new Subject<Board[]>();
    const latest = new Subject<Board[]>();
    const service = { getMyBoards: vi.fn().mockReturnValueOnce(old).mockReturnValue(latest) };
    const store = new BoardStoreService(service as unknown as BoardService);
    let boards: unknown[] = [];
    store.boards$.subscribe(value => boards = value);
    store.refreshBoards(); store.refreshBoards();
    expect(old.observed).toBe(false);
    latest.next([board]);
    expect(boards).toHaveLength(1);
    store.clearBoards();
    expect(latest.observed).toBe(false);
    old.next([board]); latest.next([board]);
    expect(boards).toEqual([]);
  });

  it('cancels profile, preference and profile-save responses on account reset', () => {
    const profileResponse = new Subject<UserProfile>();
    const preferenceResponse = new Subject<UserPreferences>();
    const profileSave = new Subject<UserProfile>();
    const store = new UserStoreService({
      getMyProfile: () => profileResponse, getMyPreferences: () => preferenceResponse,
      updateMyProfile: () => profileSave,
    } as unknown as BoardService);
    let mainId = '';
    store.mainBoardId$.subscribe(value => mainId = value);
    store.refreshMyProfile(); store.refreshMyPreferences();
    store.updateMyProfile(profile).subscribe();
    profileResponse.next(profile); preferenceResponse.next(preferences);
    store.clearProfile();
    expect(profileResponse.observed || preferenceResponse.observed || profileSave.observed).toBe(false);
    profileResponse.next(profile); preferenceResponse.next(preferences); profileSave.next(profile);
    expect(store.getCurrentProfile()).toBeNull();
    expect(mainId).toBe('');
  });

  it('does not overwrite a newer main-board choice with an earlier preference refresh', () => {
    const response = new Subject<UserPreferences>();
    const store = new UserStoreService({ getMyPreferences: () => response } as unknown as BoardService);
    let mainId = '';
    store.mainBoardId$.subscribe(value => mainId = value);
    store.refreshMyPreferences(); store.setMainBoardId('new'); response.next(preferences);
    expect(mainId).toBe('new');
  });
});
