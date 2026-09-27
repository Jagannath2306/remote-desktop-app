import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RemoteSession } from './remote-session';

describe('RemoteSession', () => {
  let component: RemoteSession;
  let fixture: ComponentFixture<RemoteSession>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoteSession],
    }).compileComponents();

    fixture = TestBed.createComponent(RemoteSession);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
