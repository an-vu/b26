import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { pendingBoardChangesGuard, routes } from '../../app.routes';
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
  it.each(['b', 'alice'])('guards navigation between board slugs under /%s', async (owner) => {
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: ':username/:boardId', component: GuardedPage, canDeactivate: [pendingBoardChangesGuard] },
    ])] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/${owner}/one`, GuardedPage);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await harness.navigateByUrl(`/${owner}/two`);
    expect(TestBed.inject(Router).url).toBe(`/${owner}/one`);
    confirm.mockReturnValue(true);
    await harness.navigateByUrl(`/${owner}/two`);
    expect(TestBed.inject(Router).url).toBe(`/${owner}/two`);
    confirm.mockRestore();
  });

  it('matches canonical, legacy, main-board, and system routes without collisions', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes.map(route =>
      route.component ? { ...route, component: GuardedPage, canDeactivate: [] } : route
    ))] });
    const harness = await RouterTestingHarness.create();
    for (const [url, params, data] of [
      ['/alice/portfolio', { username: 'alice', boardId: 'portfolio' }, {}],
      ['/b/portfolio', { boardId: 'portfolio' }, {}],
      ['/alice', { username: 'alice' }, { userMainRoute: true }],
      ['/settings', {}, { systemRoute: 'settings' }],
      ['/signin', {}, { systemRoute: 'signin' }],
    ] as const) {
      await harness.navigateByUrl(url, GuardedPage);
      const snapshot = TestBed.inject(Router).routerState.snapshot.root.firstChild!;
      expect(snapshot.params).toEqual(params);
      expect(snapshot.data).toMatchObject(data);
    }
    await harness.navigateByUrl('/u/portfolio', GuardedPage);
    expect(TestBed.inject(Router).url).toBe('/b/portfolio');
  });

  it('blocks leaving while saving and warns on browser unload', () => {
    const page = new GuardedPage();
    page.isWidgetSaving = true;
    expect(page.canLeaveBoard()).toBe(false);
    expect(page.widgetSaveError).toContain('Wait for the current operation');
    const event = { preventDefault: vi.fn(), returnValue: undefined };
    BoardPageComponent.prototype.onBeforeUnload.call(page as unknown as BoardPageComponent, event as unknown as BeforeUnloadEvent);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
});
