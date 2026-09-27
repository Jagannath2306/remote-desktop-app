import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PcList } from './pc-list';

describe('PcList', () => {
  let component: PcList;
  let fixture: ComponentFixture<PcList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PcList],
    }).compileComponents();

    fixture = TestBed.createComponent(PcList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
