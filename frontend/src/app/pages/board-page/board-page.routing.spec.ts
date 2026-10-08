import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import type { BoardService } from '../../services/board.service';
import { resolveBoardId$ } from './board-page.routing';
import { mapAccountBoards, runCreateBoardFlow } from './board-page.account';
import { boardRoute } from '../../models/board-route';

const board = { id: 'id-1', boardName: 'Portfolio', boardUrl: 'portfolio', ownerUsername: 'alice' };

describe('Owner-qualified board routes', () => {
  function resolve(username: string | null, slug: string | null, service: object) {
    return firstValueFrom(resolveBoardId$({
      boardService: service as BoardService, routeParamBoardId: slug, routeParamUsername: username,
      dataBoardId: undefined, userMainRoute: !slug,
    }));
  }

  it('validates the owner before resolving the slug for board and widget requests', async () => {
    const getBoardForUsername = vi.fn(() => of(board));
    expect(await resolve('alice', 'portfolio', { getBoardForUsername })).toBe('portfolio');
    expect(getBoardForUsername).toHaveBeenCalledWith('alice', 'portfolio');
  });

  it('never loads the bare slug when the owner lookup fails', async () => {
    const getBoardForUsername = () => throwError(() => new HttpErrorResponse({ status: 404 }));
    expect(await resolve('bob', 'portfolio', { getBoardForUsername })).toBe('__missing-owner-board__');
  });

  it('keeps legacy slugs and the username main-board shortcut working', async () => {
    expect(await resolve(null, 'portfolio', {})).toBe('portfolio');
    expect(await resolve('alice', null, { getUserMainBoard: () => of({ mainBoardUrl: 'portfolio' }) })).toBe('portfolio');
  });

  it('builds account links from the board owner, including boards shown to admins', () => {
    expect(mapAccountBoards([board])[0].route).toBe('/alice/portfolio');
    expect(boardRoute({ boardUrl: 'old-board' })).toBe('/b/old-board');
  });

  it('opens newly created boards using the returned owner', () => {
    const router = { navigateByUrl: vi.fn() };
    runCreateBoardFlow({
      boardService: { createBoard: () => of(board) }, boardStore: { refreshBoards: vi.fn() },
      userStore: { refreshMyPreferences: vi.fn() }, router, closeAccountMenu: vi.fn(),
      onStart: vi.fn(), onFinalize: vi.fn(), onError: vi.fn(),
    } as any);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/alice/portfolio');
  });
});
