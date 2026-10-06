import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AdminSettingsWidgetComponent } from './admin-settings-widget';
import { BoardService } from '../../services/board.service';
import type { SystemRoutes } from '../../models/board';

const routes: SystemRoutes = {
  globalHomepageBoardId: 'other-owner', globalHomepageBoardUrl: 'other-page',
  globalInsightsBoardId: 'insights', globalInsightsBoardUrl: 'insights',
  globalSettingsBoardId: 'settings', globalSettingsBoardUrl: 'settings',
  globalSigninBoardId: 'signin', globalSigninBoardUrl: 'signin-board',
};
const boards = ['other-owner', 'insights', 'settings', 'signin'].map(id => ({
  id, boardName: id, boardUrl: id, name: id, headline: 'Test board', version: 0,
}));

function setup() {
  const service = {
    getBoards: vi.fn(() => of(boards)),
    getSystemRoutes: vi.fn(() => of(routes)),
    updateSystemRoutes: vi.fn(() => of(routes)),
  };
  TestBed.configureTestingModule({ providers: [{ provide: BoardService, useValue: service }] });
  const fixture = TestBed.createComponent(AdminSettingsWidgetComponent);
  fixture.componentInstance.widget = { id: 1, type: 'admin-settings', title: 'Admin Settings', layout: 'span-4', config: {}, enabled: true, order: 0 };
  return { fixture, component: fixture.componentInstance, service };
}

describe('Admin route settings', () => {
  it('loads all boards and displays a mapping owned by another user', async () => {
    const { fixture, service } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(service.getBoards).toHaveBeenCalledTimes(1);
    expect(select.value).toBe('other-owner');
    expect(select.options.length).toBe(5);
    expect(select.disabled).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.permission-matrix').length).toBe(2);
  });

  for (const failure of ['getBoards', 'getSystemRoutes'] as const) {
    it(`reports ${failure} failure, prevents writes, and recovers on retry`, async () => {
      const { fixture, component, service } = setup();
      service[failure].mockImplementationOnce(() => throwError(() => new Error('offline')));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Unable to load');
      expect(fixture.nativeElement.querySelector('select').disabled).toBe(true);
      component.onRouteSelectionChanged('homepage', 'settings');
      expect(service.updateSystemRoutes).not.toHaveBeenCalled();
      fixture.nativeElement.querySelector('button').click();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
      expect(fixture.nativeElement.querySelector('select').disabled).toBe(false);
      expect(fixture.nativeElement.querySelector('select').value).toBe('other-owner');
    });
  }

  it('waits for both reads before enabling selections', async () => {
    const { fixture, service } = setup();
    const response = new Subject<SystemRoutes>();
    service.getSystemRoutes.mockReturnValue(response);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('select').disabled).toBe(true);
    response.next(routes);
    response.complete();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('select').disabled).toBe(false);
  });

  it('shows Saved only after confirmation and blocks overlapping writes', async () => {
    const { fixture, component, service } = setup();
    const response = new Subject<SystemRoutes>();
    service.updateSystemRoutes.mockReturnValue(response);
    fixture.detectChanges();
    component.onRouteSelectionChanged('homepage', 'settings');
    component.onRouteSelectionChanged('insights', 'other-owner');
    await fixture.whenStable();
    expect(service.updateSystemRoutes).toHaveBeenCalledTimes(1);
    expect(service.updateSystemRoutes).toHaveBeenCalledWith({
      globalHomepageBoardId: 'settings', globalInsightsBoardId: 'insights',
      globalSettingsBoardId: 'settings', globalSigninBoardId: 'signin',
    });
    expect(fixture.nativeElement.querySelector('select').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.settings-saved-indicator')).toBeNull();
    response.next({ ...routes, globalHomepageBoardId: 'settings' });
    response.complete();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.settings-saved-indicator').textContent).toBe('Saved');
  });

  it('shows save errors without claiming success and allows another attempt', async () => {
    const { fixture, component, service } = setup();
    service.updateSystemRoutes.mockImplementationOnce(() => throwError(() => ({ error: { message: 'Forbidden' } })));
    fixture.detectChanges();
    component.onRouteSelectionChanged('homepage', 'settings');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Forbidden');
    expect(fixture.nativeElement.querySelector('.settings-saved-indicator')).toBeNull();
    expect(fixture.nativeElement.querySelector('select').disabled).toBe(false);
    component.onRouteSelectionChanged('homepage', 'other-owner');
    expect(service.updateSystemRoutes).toHaveBeenCalledTimes(2);
  });
});
