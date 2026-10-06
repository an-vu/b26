import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { pendingBoardChangesGuard } from '../../app.routes';
import { BoardPageComponent } from './board-page';

@Component({ standalone: true, template: '' })
class GuardedPage {
  hasUnsavedChanges = true;
  isWidgetSaving = false;
  isIdentitySaving = false;
  widgetSaveError = '';
  canLeaveBoard = BoardPageComponent.prototype.canLeaveBoard;
}

describe('Unsaved board navigation', () => {
  it('guards navigation between two board slugs using the same route', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: 'b/:boardId', component: GuardedPage, canDeactivate: [pendingBoardChangesGuard] },
    ])] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/b/one', GuardedPage);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await harness.navigateByUrl('/b/two');
    expect(TestBed.inject(Router).url).toBe('/b/one');
    confirm.mockReturnValue(true);
    await harness.navigateByUrl('/b/two');
    expect(TestBed.inject(Router).url).toBe('/b/two');
    confirm.mockRestore();
  });

  it('blocks leaving while saving and warns on browser unload', () => {
    const page = new GuardedPage();
    page.isWidgetSaving = true;
    expect(page.canLeaveBoard()).toBe(false);
    expect(page.widgetSaveError).toContain('Wait for saving');
    const event = { preventDefault: vi.fn(), returnValue: undefined };
    BoardPageComponent.prototype.onBeforeUnload.call(page as unknown as BoardPageComponent, event as unknown as BeforeUnloadEvent);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
});
