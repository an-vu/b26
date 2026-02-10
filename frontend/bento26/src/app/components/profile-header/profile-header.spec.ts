import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileHeader } from './profile-header';

describe('ProfileHeader', () => {
  let component: ProfileHeader;
  let fixture: ComponentFixture<ProfileHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
