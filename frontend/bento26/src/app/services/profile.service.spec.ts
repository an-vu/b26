import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProfileService],
    });

    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call backend GET profile endpoint', () => {
    service.getProfile('default').subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/profile/default');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'default', name: 'An', headline: 'H', cards: [] });
  });

  it('should call backend PUT profile endpoint', () => {
    service
      .updateProfile('default', {
        name: 'An Updated',
        headline: 'Updated',
        cards: [{ id: 'github', label: 'GitHub', href: 'https://github.com/' }],
      })
      .subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/profile/default');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });
});
