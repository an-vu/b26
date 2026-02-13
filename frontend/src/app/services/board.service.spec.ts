import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { BoardService } from './board.service';

describe('BoardService', () => {
  let service: BoardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), BoardService],
    });

    service = TestBed.inject(BoardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call backend GET board endpoint', () => {
    service.getBoard('default').subscribe();

    const req = httpMock.expectOne('/api/board/default');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'default', name: 'An', headline: 'H' });
  });

  it('should call backend PUT board endpoint', () => {
    service
      .updateBoard('default', {
        name: 'An Updated',
        headline: 'Updated',
        cards: [{ id: 'github', label: 'GitHub', href: 'https://github.com/' }],
      })
      .subscribe();

    const req = httpMock.expectOne('/api/board/default');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('should call backend GET widgets endpoint', () => {
    service.getWidgets('default').subscribe();

    const req = httpMock.expectOne('/api/board/default/widgets');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call backend POST widget endpoint', () => {
    service
      .createWidget('default', {
        type: 'embed',
        title: 'Now Playing',
        layout: 'span-1',
        config: { embedUrl: 'https://example.com/embed' },
        enabled: true,
        order: 0,
      })
      .subscribe();

    const req = httpMock.expectOne('/api/board/default/widgets');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call backend PUT widget endpoint', () => {
    service
      .updateWidget('default', 1, {
        type: 'map',
        title: 'Places',
        layout: 'span-2',
        config: { places: ['Omaha, NE'] },
        enabled: true,
        order: 1,
      })
      .subscribe();

    const req = httpMock.expectOne('/api/board/default/widgets/1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('should call backend DELETE widget endpoint', () => {
    service.deleteWidget('default', 1).subscribe();

    const req = httpMock.expectOne('/api/board/default/widgets/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});
