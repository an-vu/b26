import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { BoardLibraryComponent } from './board-library';
import { BoardService } from '../../services/board.service';
import { BoardStoreService } from '../../services/board-store.service';
import { UserStoreService } from '../../services/user-store.service';
import { Board } from '../../models/board';

const board: Board = { id: 'a', boardUrl: 'first', boardName: 'First', name: '', headline: '', version: 3, visibility: 'private' };
function setup(mainId = '') {
  const service = {
    getMyBoards: vi.fn(() => of([board])), getMyPreferences: vi.fn(() => of({mainBoardId: mainId})),
    updateBoardVisibility: vi.fn(() => of({...board, visibility: 'public'})),
    updateMyPreferences: vi.fn(() => of({mainBoardId: 'a'})),
  };
  TestBed.configureTestingModule({providers: [
    {provide: BoardService, useValue: service}, {provide: Router, useValue: {}},
    {provide: BoardStoreService, useValue: {refreshBoards: vi.fn()}},
    {provide: UserStoreService, useValue: {setMainBoardId: vi.fn(), profile$: of({username: "alice"})}},
  ]});
  return {service, fixture: TestBed.createComponent(BoardLibraryComponent)};
}
describe('Board visibility and public main selection', () => {
  it('requires explicit confirmation before publishing a private main board', () => {
    const {service, fixture} = setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fixture.componentInstance.setMain(board);
    expect(service.updateBoardVisibility).not.toHaveBeenCalled();
    expect(service.updateMyPreferences).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fixture.componentInstance.setMain(board);
    expect(service.updateBoardVisibility).toHaveBeenCalledWith('first', 'public', 3);
    expect(service.updateMyPreferences).toHaveBeenCalledWith({mainBoardId: 'a'});
    confirm.mockRestore();
  });
  it('waits for main removal before making the board private', () => {
    const {service, fixture} = setup('a');
    const removed = new Subject<any>();
    service.updateMyPreferences.mockReturnValue(removed);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.componentInstance.changeVisibility({...board, visibility: 'public'});
    expect(service.updateMyPreferences).toHaveBeenCalledWith({mainBoardId: ''});
    expect(service.updateBoardVisibility).not.toHaveBeenCalled();
    removed.next({mainBoardId: ''}); removed.complete();
    expect(service.updateBoardVisibility).toHaveBeenCalledWith('first', 'private', 3);
    confirm.mockRestore();
  });
});
