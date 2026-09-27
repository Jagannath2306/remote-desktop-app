import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectorRef,
  inject,
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import RFB from '@novnc/novnc';

import { VncPasswordModal } from '../../modals/vnc-password-modal/vnc-password-modal';

import { VideoCallComponent } from '../../components/video-call/video-call';
import { BrowserSessionService } from '../../services/browser-session.service';

@Component({
  selector: 'app-remote-session',

  standalone: true,

  imports: [CommonModule, VideoCallComponent],

  templateUrl: './remote-session.html',

  styleUrl: './remote-session.css',
})
export class RemoteSession implements OnInit, AfterViewInit, OnDestroy {
  /*
   * ==========================================
   * SERVICES
   * ==========================================
   */

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly modalService = inject(NgbModal);

  private readonly ngZone = inject(NgZone);

  private readonly cdr = inject(ChangeDetectorRef);

  private readonly browserSessionService = inject(BrowserSessionService);
  @ViewChild(VideoCallComponent)
  private videoCallComponent?: VideoCallComponent;

  /*
   * ==========================================
   * REMOTE SCREEN
   * ==========================================
   */

  @ViewChild('screen', {
    static: false,
  })
  screen!: ElementRef<HTMLDivElement>;

  /*
   * ==========================================
   * PC INFORMATION
   * ==========================================
   */

  pcId = '';

  /*
   * ==========================================
   * VNC
   * ==========================================
   */

  private rfb: RFB | null = null;

  /*
   * ==========================================
   * CONNECTION STATE
   * ==========================================
   */

  connected = false;

  connecting = false;

  errorMessage = '';

  /*
   * ==========================================
   * VIDEO CALL STATE
   * ==========================================
   */

  showVideoCall = false;
  videoSessionId = '';

  videoJoinCode = '';

  videoSessionExpiresAt = '';

  creatingVideoSession = false;
  videoHostToken = '';

  /*
   * ==========================================
   * FULLSCREEN STATE
   * ==========================================
   */

  isFullscreen = false;

  /*
   * ==========================================
   * FULLSCREEN CHANGE HANDLER
   * ==========================================
   */

  private readonly fullscreenChangeHandler = (): void => {
    this.ngZone.run(() => {
      this.isFullscreen = !!document.fullscreenElement;
    });

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  };

  /*
   * ==========================================
   * ON INIT
   * ==========================================
   */

  ngOnInit(): void {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });

    this.pcId = this.route.snapshot.paramMap.get('pcId') || '';

    console.log('Remote PC ID:', this.pcId);
  }

  /*
   * ==========================================
   * AFTER VIEW INIT
   * ==========================================
   */

  ngAfterViewInit(): void {
    console.log('Screen element:', this.screen);

    if (!this.screen) {
      console.error('SCREEN ELEMENT NOT FOUND');

      this.errorMessage = 'Remote screen element could not be initialized.';

      return;
    }

    if (!this.pcId) {
      this.errorMessage = 'Remote PC ID is missing.';

      return;
    }

    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);

    this.connectVnc();
  }

  /*
   * ==========================================
   * CONNECT TO VNC
   * ==========================================
   */

  connectVnc(): void {
    this.ngZone.run(() => {
      this.connecting = true;

      this.connected = false;

      this.errorMessage = '';
    });

    /*
     * Keep your current VNC gateway URL.
     */

    const wsUrl = `ws://localhost:6080/vnc/${this.pcId}`;

    console.log('Connecting to VNC:', wsUrl);

    try {
      this.rfb = new RFB(this.screen.nativeElement, wsUrl);

      /*
       * Scale remote desktop.
       */

      this.rfb.scaleViewport = true;

      /*
       * Do not change remote
       * desktop resolution.
       */

      this.rfb.resizeSession = false;

      /*
       * Allow keyboard and mouse.
       */

      this.rfb.viewOnly = false;

      /*
       * ======================================
       * CONNECT
       * ======================================
       */

      this.rfb.addEventListener('connect', () => {
        console.log('✅ VNC CONNECTED');

        this.ngZone.run(() => {
          this.connected = true;

          this.connecting = false;

          this.errorMessage = '';

          this.cdr.detectChanges();
        });

        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      });

      /*
       * ======================================
       * DISCONNECT
       * ======================================
       */

      this.rfb.addEventListener('disconnect', (event: any) => {
        console.log('❌ VNC DISCONNECTED:', event);

        this.ngZone.run(() => {
          this.connected = false;

          this.connecting = false;

          this.cdr.detectChanges();
        });
      });

      /*
       * ======================================
       * SECURITY FAILURE
       * ======================================
       */

      this.rfb.addEventListener('securityfailure', (event: any) => {
        console.error('🔐 VNC SECURITY FAILURE:', event);

        this.ngZone.run(() => {
          this.connected = false;

          this.connecting = false;

          this.errorMessage = 'VNC authentication failed. Please check the password.';
        });
      });

      /*
       * ======================================
       * PASSWORD REQUIRED
       * ======================================
       */

      this.rfb.addEventListener('credentialsrequired', () => {
        console.log('🔑 VNC CREDENTIALS REQUIRED');

        this.ngZone.run(() => {
          this.cdr.detectChanges();

          this.openPasswordModal();
        });
      });

      /*
       * ======================================
       * DESKTOP NAME
       * ======================================
       */

      this.rfb.addEventListener('desktopname', (event: any) => {
        console.log('🖥️ VNC DESKTOP NAME:', event);
      });
    } catch (error) {
      console.error('❌ Failed to initialize noVNC:', error);

      this.ngZone.run(() => {
        this.connected = false;

        this.connecting = false;

        this.errorMessage = 'Failed to initialize VNC connection.';
      });
    }
  }

  /*
   * ==========================================
   * PASSWORD MODAL
   * ==========================================
   */

  private openPasswordModal(): void {
    if (!this.rfb) {
      return;
    }

    const modalRef = this.modalService.open(VncPasswordModal, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
      size: 'md',
    });

    modalRef.componentInstance.pcName = this.pcId;

    modalRef.componentInstance.pcId = this.pcId;

    modalRef.result.then(
      /*
       * Password submitted.
       */

      (password: string) => {
        console.log('VNC password received from modal');

        if (!password) {
          this.ngZone.run(() => {
            this.connecting = false;
          });

          return;
        }

        this.ngZone.run(() => {
          this.connecting = true;

          this.errorMessage = '';
        });

        this.rfb?.sendCredentials({
          password,
        });
      },

      /*
       * Modal cancelled.
       */

      () => {
        console.log('VNC password modal cancelled');

        this.ngZone.run(() => {
          this.connecting = false;

          this.connected = false;
        });

        this.rfb?.disconnect();
      },
    );
  }

  /*
   * ==========================================
   * VIDEO CALL
   * ==========================================
   */

  startVideoCall(): void {
    if (!this.pcId) {
      console.error('Cannot start video call. PC ID is missing.');

      return;
    }

    if (this.creatingVideoSession) {
      return;
    }

    console.log('Creating browser session for:', this.pcId);

    this.creatingVideoSession = true;

    this.browserSessionService.createSession(this.pcId).subscribe({
      next: (response) => {
        this.creatingVideoSession = false;

        this.videoSessionId = response.data.sessionId;

        this.videoJoinCode = response.data.joinCode;

        this.videoSessionExpiresAt = response.data.expiresAt;

        console.log('Browser session created:', response.data);

        this.showVideoCall = true;

        this.videoHostToken = response.data.hostToken;

        this.cdr.detectChanges();

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
          });
        });
      },

      error: (error) => {
        this.creatingVideoSession = false;

        console.error('Failed to create browser session:', error);

        this.errorMessage = 'Unable to create browser video session.';

        this.cdr.detectChanges();
      },
    });
  }

  closeVideoCall(): void {
    console.log('Closing video call');

    const sessionId = this.videoSessionId;

    /*
     * Close the Angular VideoCall component first.
     *
     * This triggers ngOnDestroy() and cleans up
     * camera, microphone, WebRTC and signaling.
     */
    this.showVideoCall = false;

    this.cdr.detectChanges();

    /*
     * No active backend session.
     */
    if (!sessionId) {
      this.clearVideoSession();

      return;
    }

    /*
     * Invalidate the backend browser session.
     */
    this.browserSessionService.endSession(sessionId).subscribe({
      next: () => {
        console.log('Browser session invalidated:', sessionId);

        this.clearVideoSession();
      },

      error: (error) => {
        console.error('Failed to invalidate browser session:', error);

        /*
         * Clear the local state anyway.
         */
        this.clearVideoSession();
      },
    });
  }

  /*
   * ==========================================
   * FULLSCREEN
   * ==========================================
   */

  toggleFullscreen(): void {
    const element = this.screen?.nativeElement;

    if (!element) {
      console.error('Remote screen element not found');

      return;
    }

    if (document.fullscreenElement) {
      document
        .exitFullscreen()
        .then(() => {
          console.log('Exited fullscreen');
        })
        .catch((error) => {
          console.error('Failed to exit fullscreen:', error);
        });

      return;
    }

    element
      .requestFullscreen()
      .then(() => {
        console.log('Entered fullscreen');

        this.ngZone.run(() => {
          this.isFullscreen = true;
        });

        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      })
      .catch((error) => {
        console.error('Failed to enter fullscreen:', error);
      });
  }

  /*
   * ==========================================
   * DISCONNECT VNC
   * ==========================================
   */

  disconnect(): void {
    console.log('Disconnecting VNC...');

    /*
     * Close video call too.
     */

    this.showVideoCall = false;

    /*
     * Exit fullscreen.
     */

    if (document.fullscreenElement) {
      document.exitFullscreen().catch((error) => {
        console.error('Failed to exit fullscreen:', error);
      });
    }

    /*
     * Disconnect noVNC.
     */

    if (this.rfb) {
      try {
        this.rfb.disconnect();
      } catch (error) {
        console.error('Error while disconnecting VNC:', error);
      }
    }

    /*
     * Reset state.
     */

    this.ngZone.run(() => {
      this.rfb = null;

      this.connected = false;

      this.connecting = false;

      this.isFullscreen = false;
    });
  }

  /*
   * ==========================================
   * BACK
   * ==========================================
   */

  backToPcList(): void {
    console.log('Returning to remote PC list');

    this.disconnect();

    this.router.navigate(['/remote-pcs']);
  }

  private clearVideoSession(): void {
    this.videoSessionId = '';

    this.videoJoinCode = '';
    
    this.videoHostToken = '';

    this.videoSessionExpiresAt = '';

    this.creatingVideoSession = false;

    this.cdr.detectChanges();
  }

  closeVideoPanel(): void {
    console.log('PC1 closing video panel');

    /*
     * Let VideoCallComponent perform the
     * intentional End Call flow.
     *
     * This will:
     * 1. send "session-ended" to PC2
     * 2. cleanup WebRTC
     * 3. stop camera/microphone
     * 4. emit callEnded
     */
    if (this.videoCallComponent) {
      this.videoCallComponent.endCall();

      return;
    }

    /*
     * Fallback if child component
     * is unexpectedly unavailable.
     */
    this.closeVideoCall();
  }
  /*
   * ==========================================
   * DESTROY
   * ==========================================
   */

  ngOnDestroy(): void {
    console.log('Remote session destroyed:', this.pcId);

    document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);

    this.disconnect();
  }
}
