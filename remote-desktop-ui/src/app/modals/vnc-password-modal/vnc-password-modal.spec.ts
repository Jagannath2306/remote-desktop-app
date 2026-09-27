import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VncPasswordModal } from './vnc-password-modal';

describe('VncPasswordModal', () => {
  let component: VncPasswordModal;
  let fixture: ComponentFixture<VncPasswordModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VncPasswordModal],
    }).compileComponents();

    fixture = TestBed.createComponent(VncPasswordModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
