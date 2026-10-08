import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import type { BoardService } from '../../services/board.service';

export function normalizeBoardUrl(rawValue: string): string {
  const normalized = rawValue.trim().toLowerCase().replace(/\s+/g, '-');
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : '';
}

export type PreparedBoardIdentityUpdate =
  | { kind: 'reset'; draftName: string; draftUrl: string }
  | { kind: 'noop'; draftName: string; draftUrl: string }
  | { kind: 'update'; boardName: string; boardUrl: string };

export function prepareBoardIdentityUpdate(params: {
  draftName: string;
  draftUrl: string;
  persistedName: string;
  persistedUrl: string;
}): PreparedBoardIdentityUpdate {
  const normalizedName = params.draftName.trim();
  const normalizedUrl = normalizeBoardUrl(params.draftUrl);

  if (!normalizedName || !normalizedUrl) {
    return {
      kind: 'reset',
      draftName: params.persistedName,
      draftUrl: params.persistedUrl,
    };
  }

  if (normalizedName === params.persistedName && normalizedUrl === params.persistedUrl) {
    return {
      kind: 'noop',
      draftName: normalizedName,
      draftUrl: normalizedUrl,
    };
  }

  return {
    kind: 'update',
    boardName: normalizedName,
    boardUrl: normalizedUrl,
  };
}

export function resolveBoardId$(params: {
  boardService: BoardService;
  routeParamBoardId: string | null;
  routeParamUsername: string | null;
  dataBoardId: unknown;
  userMainRoute: boolean;
}): Observable<string> {
  const { boardService, routeParamBoardId, routeParamUsername, dataBoardId, userMainRoute } = params;

  if (routeParamUsername && routeParamBoardId) {
    return boardService.getBoardForUsername(routeParamUsername, routeParamBoardId).pipe(
      map(board => board.boardUrl),
      catchError(() => of('__missing-owner-board__'))
    );
  }

  if (routeParamBoardId && routeParamBoardId.trim().length > 0) {
    return of(routeParamBoardId);
  }

  if (userMainRoute && routeParamUsername && routeParamUsername.trim().length > 0) {
    const username = routeParamUsername.trim().toLowerCase();
    return boardService.getUserMainBoard(username).pipe(
      map((result) => result.mainBoardUrl),
      catchError(() => of('__missing-user-main-board__'))
    );
  }

  if (typeof dataBoardId === 'string' && dataBoardId.trim().length > 0) {
    return of(dataBoardId);
  }

  return of('__missing-board__');
}
