import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('Authenticated board analytics', () => {
  it('includes the session on summaries and private-board view tracking', () => {
    TestBed.configureTestingModule({providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      {provide: AuthService, useValue: {getAccessToken: () => 'local-test-token'}}
    ]});
    const http = TestBed.inject(HttpClient), requests = TestBed.inject(HttpTestingController);
    http.get('/api/insights/board-id/summary').subscribe();
    const summary = requests.expectOne('/api/insights/board-id/summary');
    expect(summary.request.headers.get('Authorization')).toBe('Bearer local-test-token');
    summary.flush({});
    http.post('/api/insights/view', {boardId: 'board-id'}).subscribe();
    const view = requests.expectOne('/api/insights/view');
    expect(view.request.headers.get('Authorization')).toBe('Bearer local-test-token');
    view.flush(null); requests.verify();
  });
});
