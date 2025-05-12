import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandFilterComponent } from './brand-filter.component';

describe('BrandFilterComponent', () => {
  let component: BrandFilterComponent;
  let fixture: ComponentFixture<BrandFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandFilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
