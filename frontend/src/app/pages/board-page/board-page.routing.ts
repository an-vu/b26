import { Observable, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import type { Board } from '../../models/board';
import { switchMap } from 'rxjs/operators';
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

/** Reuse the board returned by owner validation rather than fetching it again by bare slug. */
export function resolveBoard$(params: {
  boardService: BoardService;
  routeParamBoardId: string | null;
  routeParamUsername: string | null;
  dataBoardId: unknown;
  userMainRoute: boolean;
}): Observable<Board> {
  const { boardService, routeParamBoardId, routeParamUsername, dataBoardId, userMainRoute } = params;
  if (routeParamUsername && routeParamBoardId) {
    return boardService.getBoardForUsername(routeParamUsername, routeParamBoardId);
  }
  if (routeParamBoardId?.trim()) return boardService.getBoard(routeParamBoardId);
  if (userMainRoute && routeParamUsername?.trim()) {
    return boardService.getUserMainBoard(routeParamUsername.trim().toLowerCase()).pipe(
      switchMap(result => boardService.getBoard(result.mainBoardUrl))
    );
  }
  if (typeof dataBoardId === 'string' && dataBoardId.trim()) return boardService.getBoard(dataBoardId);
  return throwError(() => new HttpErrorResponse({ status: 404 }));
}
