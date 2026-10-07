import type { BoardIdentity } from './board-identity';

// Keep legacy links usable when an API response has no owner metadata.
export function boardRoute(board: Pick<BoardIdentity, 'boardUrl' | 'ownerUsername'>): string {
  const owner = board.ownerUsername ? encodeURIComponent(board.ownerUsername) : 'b';
  return `/${owner}/${encodeURIComponent(board.boardUrl)}`;
}
