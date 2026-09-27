import { Component, inject, ChangeDetectorRef } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';
import { BrowserSessionService } from '../../services/browser-session.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-join-browser-session',

  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './join-browser-session.html',

  styleUrl: './join-browser-session.css',
})
export class JoinBrowserSession {
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly browserSessionService = inject(BrowserSessionService);

  /*
   * ==========================================
   * FORM
   * ==========================================
   */

  roomId = '';

  errorMessage = '';
  joinCode = '';

  joining = false;

  /*
   * ==========================================
   * JOIN SESSION
   * ==========================================
   */

  joinSession(): void {
    const pcId = this.roomId.trim();

    const joinCode = this.joinCode.trim();

    if (!pcId) {
      this.errorMessage = 'Please enter the PC ID.';

      return;
    }

    if (!joinCode) {
      this.errorMessage = 'Please enter the join code.';

      return;
    }

    if (joinCode.length !== 6) {
      this.errorMessage = 'Please enter a valid 6-digit join code.';

      return;
    }

    this.errorMessage = '';

    this.joining = true;

    console.log('Joining browser session:', pcId);

    this.browserSessionService
      .joinSession(pcId, joinCode)
      .pipe(
        /*
         * Always reset the button,
         * whether API succeeds or fails.
         */
        finalize(() => {
          this.joining = false;

          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          const { sessionId, pcId, participantToken } = response.data;

          console.log('Browser session validated:', sessionId);

          /*
           * Save reconnect credentials for PC2.
           *
           * sessionStorage survives page refresh
           * in the same browser tab.
           */
          sessionStorage.setItem('remoteDeskSessionId', sessionId);

          sessionStorage.setItem('remoteDeskParticipantToken', participantToken);

          sessionStorage.setItem('remoteDeskPcId', pcId);

          this.router.navigate(['/video-call', sessionId]);
        },

        error: (error) => {
          console.error('Join browser session failed:', error);

          if (error.status === 401 || error.status === 403) {
            this.errorMessage = 'Unauthorized. The PC ID or join code is invalid or expired.';
          } else if (error.status === 404) {
            this.errorMessage = 'Browser session not found. Please check the PC ID and join code.';
          } else if (error.status === 0) {
            this.errorMessage = 'Unable to connect to the server. Please check your connection.';
          } else {
            this.errorMessage =
              error.error?.message || 'Unable to join the browser session. Please try again.';
          }

          this.cdr.detectChanges();
        },
      });
  }
}
