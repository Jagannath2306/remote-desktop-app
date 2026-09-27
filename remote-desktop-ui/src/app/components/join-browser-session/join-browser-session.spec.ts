import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JoinBrowserSession } from './join-browser-session';

describe('JoinBrowserSession', () => {
  let component: JoinBrowserSession;
  let fixture: ComponentFixture<JoinBrowserSession>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinBrowserSession],
    }).compileComponents();

    fixture = TestBed.createComponent(JoinBrowserSession);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
