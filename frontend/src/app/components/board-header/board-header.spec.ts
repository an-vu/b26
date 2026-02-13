import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoardHeaderComponent } from './board-header';

describe('BoardHeaderComponent', () => {
  let component: BoardHeaderComponent;
  let fixture: ComponentFixture<BoardHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BoardHeaderComponent);
    component = fixture.componentInstance;
    component.name = 'Test';
    component.headline = 'Headline';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
