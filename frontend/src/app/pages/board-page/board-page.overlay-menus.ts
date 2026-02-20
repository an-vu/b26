export function getDocumentClickMenuCloseActions(params: {
  eventTarget: EventTarget | null;
  hostElement: HTMLElement;
  isAccountMenuOpen: boolean;
  isBoardIdentityMenuOpen: boolean;
}): {
  closeAccountMenu: boolean;
  closeBoardIdentityMenu: boolean;
} {
  if (!params.isAccountMenuOpen && !params.isBoardIdentityMenuOpen) {
    return {
      closeAccountMenu: false,
      closeBoardIdentityMenu: false,
    };
  }

  if (!(params.eventTarget instanceof Node)) {
    return {
      closeAccountMenu: params.isAccountMenuOpen,
      closeBoardIdentityMenu: params.isBoardIdentityMenuOpen,
    };
  }

  const accountMenuWrap = params.hostElement.querySelector('.account-menu-wrap');
  const boardIdentityWrap = params.hostElement.querySelector('.board-identity-wrap');

  return {
    closeAccountMenu:
      params.isAccountMenuOpen && (!accountMenuWrap || !accountMenuWrap.contains(params.eventTarget)),
    closeBoardIdentityMenu:
      params.isBoardIdentityMenuOpen && (!boardIdentityWrap || !boardIdentityWrap.contains(params.eventTarget)),
  };
}

export function getEscapeMenuCloseActions(params: {
  isAccountMenuOpen: boolean;
  isBoardIdentityMenuOpen: boolean;
}): {
  closeAccountMenu: boolean;
  closeBoardIdentityMenu: boolean;
} {
  return {
    closeAccountMenu: params.isAccountMenuOpen,
    closeBoardIdentityMenu: params.isBoardIdentityMenuOpen,
  };
}
