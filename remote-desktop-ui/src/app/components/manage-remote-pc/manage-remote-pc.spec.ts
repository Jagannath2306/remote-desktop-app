import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageRemotePcComponent } from './manage-remote-pc';

describe('ManageRemotePc', () => {
  let component: ManageRemotePcComponent;
  let fixture: ComponentFixture<ManageRemotePcComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageRemotePcComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageRemotePcComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
