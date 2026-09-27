import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoCall } from './video-call';

describe('VideoCall', () => {
  let component: VideoCall;
  let fixture: ComponentFixture<VideoCall>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoCall],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoCall);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
