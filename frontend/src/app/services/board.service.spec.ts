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
    req.flush({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'An', headline: 'H' });
  });

  it('should call backend GET boards endpoint', () => {
    service.getBoards().subscribe();

    const req = httpMock.expectOne('/api/board?page=0&size=20');
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('should call backend GET widgets endpoint', () => {
    service.getWidgets('default').subscribe();

    const req = httpMock.expectOne('/api/board/default/widgets');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call backend PATCH board identity endpoint', () => {
    service.updateBoardIdentity('default', { boardName: 'Berkshire', boardUrl: 'berkshire' }).subscribe();

    const req = httpMock.expectOne('/api/board/default/identity');
    expect(req.request.method).toBe('PATCH');
    req.flush({
      id: 'default',
      boardName: 'Berkshire',
      boardUrl: 'berkshire',
      name: 'An',
      headline: 'H',
    });
  });
});
