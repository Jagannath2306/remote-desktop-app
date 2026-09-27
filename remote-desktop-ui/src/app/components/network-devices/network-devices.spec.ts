import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NetworkDevices } from './network-devices';

describe('NetworkDevices', () => {
  let component: NetworkDevices;
  let fixture: ComponentFixture<NetworkDevices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetworkDevices],
    }).compileComponents();

    fixture = TestBed.createComponent(NetworkDevices);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
