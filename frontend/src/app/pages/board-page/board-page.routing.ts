import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import type { BoardService } from '../../services/board.service';

type SystemRoute = 'main' | 'insights' | 'settings' | 'signin';

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
  systemRoute: unknown;
  userMainRoute: boolean;
}): Observable<string> {
  const { boardService, routeParamBoardId, routeParamUsername, dataBoardId, systemRoute, userMainRoute } = params;

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

  if (systemRoute === 'main' || systemRoute === 'insights' || systemRoute === 'settings' || systemRoute === 'signin') {
    return boardService.getSystemRoutes().pipe(
      map((routes) => {
        if (systemRoute === 'main') {
          return routes.globalHomepageBoardUrl || 'home';
        }
        if (systemRoute === 'insights') {
          return routes.globalInsightsBoardUrl || 'insights';
        }
        if (systemRoute === 'signin') {
          return routes.globalSigninBoardUrl || routes.globalLoginBoardUrl || 'signin-board';
        }
        return routes.globalSettingsBoardUrl || 'settings';
      }),
      catchError(() => of(defaultBoardBySystemRoute(systemRoute)))
    );
  }

  return of('default');
}

function defaultBoardBySystemRoute(systemRoute: unknown): string {
  if (systemRoute === 'main') {
    return 'home';
  }
  if (systemRoute === 'insights') {
    return 'insights';
  }
  if (systemRoute === 'signin') {
    return 'signin-board';
  }
  return 'settings';
}
