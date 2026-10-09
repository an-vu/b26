import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { WidgetHostComponent } from '../widget-host/widget-host';

describe('Link widget tracking', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [WidgetHostComponent], providers: [provideHttpClient(), provideHttpClientTesting()],
  }));

  it('records the board and widget only when a real board link is clicked', () => {
    const fixture = TestBed.createComponent(WidgetHostComponent);
    fixture.componentRef.setInput('widget', {
      id: 42, type: 'link', title: 'Link', layout: 'span-1', enabled: true, order: 0,
      config: { url: 'https://example.com' },
    });
    fixture.componentRef.setInput('boardId', 'stable-board-id');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectNone('/api/insights/widgets/42/click');
    fixture.debugElement.query(By.css('a.link')).triggerEventHandler('click');
    const request = http.expectOne('/api/insights/widgets/42/click');
    expect(request.request.body).toEqual({ boardId: 'stable-board-id' });
    request.flush({}, { status: 429, statusText: 'Too Many Requests' });
    expect(fixture.nativeElement.querySelector('a').href).toBe('https://example.com/');
    http.verify();

    fixture.componentRef.setInput('previewMode', true);
    fixture.detectChanges();
    fixture.debugElement.query(By.css('a.link')).triggerEventHandler('click');
    http.expectNone('/api/insights/widgets/42/click');
    fixture.componentRef.setInput('previewMode', false);
    fixture.componentRef.setInput('boardId', undefined);
    fixture.detectChanges();
    fixture.debugElement.query(By.css('a.link')).triggerEventHandler('click');
    http.expectNone('/api/insights/widgets/42/click');
  });
});
