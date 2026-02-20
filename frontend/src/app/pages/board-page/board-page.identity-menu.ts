export function toggleBoardIdentityMenuState(isOpen: boolean): boolean {
  return !isOpen;
}

export function closeBoardIdentityMenuState(params: {
  persistBoardUrlDraft: () => void;
}): boolean {
  params.persistBoardUrlDraft();
  return false;
}
