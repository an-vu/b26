import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { defer, of, throwError } from 'rxjs';

import { ProfilePageComponent } from './profile-page';
import { ProfileService } from '../../services/profile.service';

describe('ProfilePageComponent', () => {
  let component: ProfilePageComponent;
  let fixture: ComponentFixture<ProfilePageComponent>;
  let profileServiceStub: {
    getProfile: ProfileService['getProfile'];
    updateProfile: ProfileService['updateProfile'];
  };

  const routeStub = {
    paramMap: of(convertToParamMap({ profileId: 'default' })),
  };

  beforeEach(async () => {
    profileServiceStub = {
      getProfile: () =>
        of({
          id: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
          cards: [],
        }),
      updateProfile: () =>
        of({
          id: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
          cards: [],
        }),
    };

    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        { provide: ProfileService, useValue: profileServiceStub },
        { provide: ActivatedRoute, useValue: routeStub },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    profileServiceStub.getProfile = () =>
      of({
        id: 'default',
        name: 'An Vu',
        headline: 'Software Engineer',
        cards: [],
      });

    fixture = TestBed.createComponent(ProfilePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render loading state before profile resolves', () => {
    profileServiceStub.getProfile = () =>
      defer(() =>
        Promise.resolve({
          id: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
          cards: [],
        })
      );

    fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Loading...');
  });

  it('should render missing state when profile request fails', () => {
    profileServiceStub.getProfile = () => throwError(() => new Error('boom'));

    fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Profile not found.');
  });
});
