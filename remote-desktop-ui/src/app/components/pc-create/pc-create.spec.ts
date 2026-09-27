import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PcCreate } from './pc-create';

describe('PcCreate', () => {
  let component: PcCreate;
  let fixture: ComponentFixture<PcCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PcCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(PcCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
