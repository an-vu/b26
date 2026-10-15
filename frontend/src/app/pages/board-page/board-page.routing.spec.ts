import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import type { BoardService } from '../../services/board.service';
import { resolveBoard$ } from './board-page.routing';
import { mapAccountBoards } from './board-editor.store';
import { boardRoute } from '../../models/board-route';

const board = { id: 'id-1', boardName: 'Portfolio', boardUrl: 'portfolio', ownerUsername: 'alice' };

describe('Owner-qualified board routes', () => {
  function resolve(username: string | null, slug: string | null, service: object) {
    return firstValueFrom(resolveBoard$({
      boardService: service as BoardService, routeParamBoardId: slug, routeParamUsername: username,
      dataBoardId: undefined, userMainRoute: !slug,
    }));
  }

  it('validates the owner before resolving the slug for board and widget requests', async () => {
    const getBoardForUsername = vi.fn(() => of(board));
    expect(await resolve('alice', 'portfolio', { getBoardForUsername })).toEqual(board);
    expect(getBoardForUsername).toHaveBeenCalledWith('alice', 'portfolio');
  });

  it('never loads the bare slug when the owner lookup fails', async () => {
    const getBoardForUsername = () => throwError(() => new HttpErrorResponse({ status: 404 }));
    await expect(resolve('bob', 'portfolio', { getBoardForUsername })).rejects.toMatchObject({ status: 404 });
  });

  it('keeps legacy slugs and the username main-board shortcut working', async () => {
    expect(await resolve(null, 'portfolio', { getBoard: () => of(board) })).toEqual(board);
    expect(await resolve('alice', null, { getUserMainBoard: () => of({ mainBoardUrl: 'portfolio' }), getBoard: () => of(board) })).toEqual(board);
  });

  it('builds account links from the board owner, including boards shown to admins', () => {
    expect(mapAccountBoards([board])[0].route).toBe('/alice/portfolio');
    expect(boardRoute({ boardUrl: 'old-board' })).toBe('/b/old-board');
  });
});
