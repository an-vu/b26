import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { pendingBoardChangesGuard, routes } from '../../app.routes';

@Component({ standalone: true, template: '' })
class GuardedPage {
  canLeaveBoard() {
    return window.confirm('Discard unsaved board changes?');
  }
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
      route.component || route.loadComponent ? { ...route, loadComponent: undefined, component: GuardedPage, canDeactivate: [] } : route
    ))] });
    const harness = await RouterTestingHarness.create();
    for (const [url, params, data] of [
      ['/alice/portfolio', { username: 'alice', boardId: 'portfolio' }, {}],
      ['/b/portfolio', { boardId: 'portfolio' }, {}],
      ['/alice', { username: 'alice' }, { userMainRoute: true }],
      ['/settings', {}, {}],
      ['/signin', {}, {}],
    ] as const) {
      await harness.navigateByUrl(url, GuardedPage);
      const snapshot = TestBed.inject(Router).routerState.snapshot.root.firstChild!;
      expect(snapshot.params).toEqual(params);
      expect(snapshot.data).toMatchObject(data);
    }
    await harness.navigateByUrl('/u/portfolio', GuardedPage);
    expect(TestBed.inject(Router).url).toBe('/b/portfolio');
  });
});
