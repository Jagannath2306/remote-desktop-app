import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
  Output,
  inject,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { BrowserSessionService } from '../../services/browser-session.service';
interface SignalingMessage {
  type: string;
  roomId?: string;
  data?: any;
}
@Component({
  selector: 'app-video-call',
  standalone: true,
  templateUrl: './video-call.html',
  styleUrl: './video-call.css',
  imports: [CommonModule],
})
export class VideoCallComponent implements AfterViewInit, OnDestroy {
  /* * ========================================== * SERVICES * ========================================== */ private readonly route =
    inject(ActivatedRoute);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private readonly browserSessionService = inject(BrowserSessionService);
  /* * ========================================== * INPUT * ========================================== * * When this component is embedded inside * RemoteSession: * * <app-video-call * [roomId]="pcId"> * </app-video-call> * * roomId will come from RemoteSession. * * When the component is opened using: * * /video-call/:roomId * * it can still read the roomId from the route. */
  @Input() roomId = '';
  @Input() embedded = false;
  @Output() callEnded = new EventEmitter<void>();
  @Input() hostToken = '';
  /* * ========================================== * VIDEO ELEMENTS * ========================================== */ @ViewChild(
    'localVideo',
  )
  localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  /* * ========================================== * CONNECTION STATE * ========================================== */ connectionStatus:
    'connecting' | 'connected' | 'disconnected' = 'connecting';
  /* * ========================================== * MEDIA STATE * ========================================== */
  microphoneEnabled = true;
  cameraEnabled = true;
  remoteVideoPlaying = false;

  remoteMicrophoneEnabled = true;
  remoteCameraEnabled = true;
  /* * ========================================== * WEBRTC * ========================================== */ private localStream?: MediaStream;
  private peerConnection?: RTCPeerConnection;
  private signalingSocket?: WebSocket;
  private isFirstClient = false;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  /* * ========================================== * COMPONENT STATE * ========================================== */ private initialized = false;
  private destroyed = false;
  /* * ========================================== * AFTER VIEW INIT * ========================================== */

  ngAfterViewInit(): void {
    console.log('VideoCall ngAfterViewInit', {
      embedded: this.embedded,
      roomId: this.roomId,
      destroyed: this.destroyed,
    });

    /*
     * PC2 standalone page gets roomId
     * from the URL.
     */
    if (!this.roomId) {
      this.roomId = this.route.snapshot.paramMap.get('roomId') ?? '';
    }

    console.log('Video call room:', this.roomId);

    if (!this.roomId) {
      console.error('Video call session ID is missing');

      return;
    }

    /*
     * PC1 embedded call.
     *
     * PC1 owns the session and MUST NOT
     * perform participant reconnect validation.
     */
    if (this.embedded) {
      console.log('PC1 embedded call - starting WebRTC');

      this.initialize();

      return;
    }

    /*
     * PC2 standalone call.
     */
    console.log('PC2 standalone call - validating session');

    this.validateReconnectSession();
  }
  /* * ========================================== * INITIALIZE * ========================================== */ private async initialize(): Promise<void> {
    if (this.initialized || this.destroyed) {
      return;
    }
    this.initialized = true;
    this.connectionStatus = 'connecting';
    try {
      /* * 1. Request camera and microphone. */
      await this.startCamera();
      if (this.destroyed) {
        return;
      }
      /* * 2. Create WebRTC connection. */ this.createPeerConnection();
      /* * 3. Connect to signaling server. */ this.connectSignaling();
    } catch (error) {
      console.error('Video call initialization failed:', error);
      this.connectionStatus = 'disconnected';
      this.initialized = false;
    }
  }
  /* * ========================================== * CAMERA + MICROPHONE * ========================================== */
  private async startCamera(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (this.destroyed) {
        this.localStream.getTracks().forEach((track) => track.stop());

        this.localStream = undefined;
        return;
      }

      const videoElement = this.localVideo.nativeElement;

      videoElement.srcObject = this.localStream;

      /*
       * Important when VideoCallComponent
       * is dynamically shown inside
       * RemoteSession.
       */
      videoElement.muted = true;

      try {
        await videoElement.play();
        this.logVideoState('LOCAL after play', videoElement);

        setTimeout(() => {
          this.logVideoState('LOCAL after 2 seconds', videoElement);
        }, 2000);

        console.log('Local video playback started');
      } catch (error) {
        console.warn('Local video autoplay failed:', error);
      }

      this.microphoneEnabled = true;
      this.cameraEnabled = true;

      /*
       * Force browser layout/repaint.
       */
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });

      console.log('Camera and microphone access granted');
    } catch (error) {
      console.error('Camera/microphone access failed:', error);

      throw error;
    }
  }
  /* * ========================================== * CREATE PEER CONNECTION * ========================================== */
  private createPeerConnection(): void {
    /* * Close an existing connection * before creating another one. */ if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = undefined;
    }
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    /* * Add local camera and microphone. */ this.localStream?.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });
    /* * ====================================== * REMOTE TRACK * ====================================== */
    this.peerConnection.ontrack = (event: RTCTrackEvent) => {
      console.log('Remote track received:', event.track.kind);

      const remoteStream = event.streams[0];

      if (!remoteStream) {
        return;
      }

      const video = this.remoteVideo.nativeElement;

      /*
       * Assign only once.
       */
      if (video.srcObject !== remoteStream) {
        video.srcObject = remoteStream;
      }

      /*
       * Watch the actual video lifecycle.
       */

      video.onloadedmetadata = async () => {
        console.log('REMOTE: loadedmetadata');

        this.logVideoState('REMOTE loadedmetadata', video);

        try {
          await video.play();

          console.log('REMOTE: play() successful');
        } catch (error) {
          console.error('REMOTE: play() failed', error);
        }
      };

      video.onloadeddata = () => {
        console.log('REMOTE: loadeddata');

        this.logVideoState('REMOTE loadeddata', video);
      };

      video.oncanplay = () => {
        console.log('REMOTE: canplay');

        this.logVideoState('REMOTE canplay', video);
      };

      video.onplaying = () => {
        console.log('REMOTE: playing');

        this.logVideoState('REMOTE playing', video);

        this.ngZone.run(() => {
          this.remoteVideoPlaying = true;

          this.connectionStatus = 'connected';

          /*
           * Force Angular to update the template immediately.
           *
           * Without this, the video is already playing,
           * but the placeholder may remain until another
           * Angular event occurs such as clicking Mic,
           * Camera or Fullscreen.
           */
          this.cdr.detectChanges();

          console.log('Remote video visible:', this.remoteVideoPlaying);
        });
      };

      /*
       * Check again shortly afterward.
       */
      setTimeout(() => {
        this.logVideoState('REMOTE after 2 seconds', video);
      }, 2000);
    };
    /* * ====================================== * LOCAL ICE CANDIDATE * ====================================== */
    this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate) {
        return;
      }
      console.log('Local ICE candidate generated');
      this.sendSignalingMessage({ type: 'ice-candidate', data: event.candidate.toJSON() });
    };
    /* * ====================================== * CONNECTION STATE * ====================================== */
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;

      console.log('WebRTC connection state:', state);

      this.ngZone.run(() => {
        if (state === 'connected') {
          this.connectionStatus = 'connected';
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          this.connectionStatus = 'disconnected';
        } else {
          this.connectionStatus = 'connecting';
        }

        this.cdr.detectChanges();

        console.log('UI connection status:', this.connectionStatus);
      });
    };
    /* * ====================================== * ICE CONNECTION STATE * ====================================== */ this.peerConnection.oniceconnectionstatechange =
      () => {
        console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
      };
    console.log('WebRTC peer connection created');
  }
  /* * ========================================== * SIGNALING * ========================================== */
  private connectSignaling(): void {
    this.connectionStatus = 'connecting';
    const signalingUrl = environment.signalingUrl;
    console.log('Connecting to signaling server:', signalingUrl);
    this.signalingSocket = new WebSocket(signalingUrl);
    /* * ====================================== * SIGNALING CONNECTED * ====================================== */ this.signalingSocket.onopen =
      () => {
        console.log('Connected to signaling server');
        if (this.embedded) {
          /*
           * PC1 / session owner
           */
          this.sendSignalingMessage({
            type: 'join-room',

            data: {
              role: 'host',
              hostToken: this.hostToken,
            },
          });
        } else {
          /*
           * PC2 / participant
           */
          const participantToken = sessionStorage.getItem('remoteDeskParticipantToken');

          this.sendSignalingMessage({
            type: 'join-room',

            data: {
              role: 'participant',
              participantToken,
            },
          });
        }
      };
    /* * ====================================== * SIGNALING MESSAGE * ====================================== */ this.signalingSocket.onmessage =
      async (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data) as SignalingMessage;
          console.log('Signaling message received:', message);
          await this.handleSignalingMessage(message);
        } catch (error) {
          console.error('Signaling message handling failed:', error);
        }
      };
    /* * ====================================== * SIGNALING ERROR * ====================================== */ this.signalingSocket.onerror =
      (error: Event) => {
        console.error('Signaling WebSocket error:', error);
      };
    /* * ====================================== * SIGNALING CLOSED * ====================================== */ this.signalingSocket.onclose =
      () => {
        console.log('Signaling WebSocket disconnected');
        if (!this.destroyed) {
          this.connectionStatus = 'disconnected';
        }
      };
  }
  /* * ========================================== * HANDLE SIGNALING MESSAGE * ========================================== */
  private async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    switch (message.type) {
      /*
       * ======================================
       * ROOM JOINED
       * ======================================
       */
      case 'room-joined':
        this.isFirstClient = message.data?.isFirstClient === true;

        console.log('Room joined');

        console.log('First client:', this.isFirstClient);

        break;

      /*
       * ======================================
       * PEER JOINED
       * ======================================
       */
      case 'peer-joined':
        console.log('Remote browser joined');

        /*
         * Send current microphone/camera state
         * to the newly joined peer.
         */
        this.sendSignalingMessage({
          type: 'media-state',

          data: {
            microphoneEnabled: this.microphoneEnabled,

            cameraEnabled: this.cameraEnabled,
          },
        });

        /*
         * The first browser in the room
         * creates the WebRTC offer.
         */
        if (this.isFirstClient) {
          console.log('First client - creating WebRTC offer');

          await this.createOffer();
        } else {
          console.log('Not first client - waiting for offer');
        }

        break;

      /*
       * ======================================
       * OFFER
       * ======================================
       */
      case 'offer':
        console.log('WebRTC offer received');

        if (!message.data) {
          console.error('Offer data is missing');

          return;
        }

        await this.handleOffer(message.data);

        break;

      /*
       * ======================================
       * ANSWER
       * ======================================
       */
      case 'answer':
        console.log('WebRTC answer received');

        if (!message.data) {
          console.error('Answer data is missing');

          return;
        }

        await this.handleAnswer(message.data);

        break;

      /*
       * ======================================
       * ICE CANDIDATE
       * ======================================
       */
      case 'ice-candidate':
        console.log('Remote ICE candidate received');

        if (!message.data) {
          console.error('ICE candidate data is missing');

          return;
        }

        await this.handleIceCandidate(message.data);

        break;

      /*
       * ======================================
       * SESSION ENDED
       * ======================================
       *
       * PC1 intentionally ended the session.
       * PC2 should clear its reconnect
       * credentials and return to Join Session.
       */
      case 'session-ended':
        console.log('Remote session intentionally ended');

        if (!this.embedded) {
          this.clearReconnectCredentials();

          this.ngZone.run(() => {
            this.router
              .navigateByUrl('/join-browser-session')
              .then((success) => {
                console.log('Join page navigation:', success);
              })
              .catch((error) => {
                console.error('Join page navigation failed:', error);
              });
          });
        }

        break;

      /*
       * ======================================
       * PEER LEFT
       * ======================================
       *
       * Peer disconnected unexpectedly.
       * Keep the session ready for reconnect.
       */
      case 'peer-left':
        console.log('Remote browser disconnected');

        this.ngZone.run(() => {
          this.connectionStatus = 'disconnected';

          this.cdr.detectChanges();
        });

        this.clearRemoteVideo();

        this.resetPeerConnection();

        this.createPeerConnection();

        break;

      /*
       * ======================================
       * REMOTE MEDIA STATE
       * ======================================
       */
      case 'media-state': {
        const mediaState = message.data as {
          microphoneEnabled?: boolean;
          cameraEnabled?: boolean;
        };

        console.log('Remote media state received:', mediaState);

        this.ngZone.run(() => {
          if (typeof mediaState.microphoneEnabled === 'boolean') {
            this.remoteMicrophoneEnabled = mediaState.microphoneEnabled;
          }

          if (typeof mediaState.cameraEnabled === 'boolean') {
            this.remoteCameraEnabled = mediaState.cameraEnabled;
          }

          this.cdr.detectChanges();
        });

        break;
      }
      /*
       * ======================================
       * REMOTE UNAUTHORIZED
       * ======================================
       */
      case 'room-unauthorized':
        console.error('Signaling room authorization failed');

        if (!this.embedded) {
          this.clearReconnectCredentials();

          this.ngZone.run(() => {
            this.router.navigateByUrl('/join-browser-session');
          });
        }

        break;
      /*
       * ======================================
       * UNKNOWN MESSAGE
       * ======================================
       */
      default:
        console.log('Unknown signaling message:', message.type);

        break;
    }
  }
  /* * ========================================== * CREATE OFFER * ========================================== */ private async createOffer(): Promise<void> {
    if (!this.peerConnection) {
      console.error('Peer connection does not exist');
      return;
    }
    try {
      console.log('Creating WebRTC offer...');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.sendSignalingMessage({ type: 'offer', data: offer });
      console.log('WebRTC offer sent');
    } catch (error) {
      console.error('Failed to create offer:', error);
    }
  }
  /* * ========================================== * HANDLE OFFER * ========================================== */ private async handleOffer(
    offer: RTCSessionDescriptionInit,
  ): Promise<void> {
    if (!this.peerConnection) {
      console.error('Peer connection does not exist');
      return;
    }
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Remote offer applied');
      await this.flushPendingIceCandidates();
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.sendSignalingMessage({ type: 'answer', data: answer });
      console.log('WebRTC answer sent');
    } catch (error) {
      console.error('Failed to handle offer:', error);
    }
  }
  /* * ========================================== * HANDLE ANSWER * ========================================== */ private async handleAnswer(
    answer: RTCSessionDescriptionInit,
  ): Promise<void> {
    if (!this.peerConnection) {
      console.error('Peer connection does not exist');
      return;
    }
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Remote answer applied');
      await this.flushPendingIceCandidates();
    } catch (error) {
      console.error('Failed to handle answer:', error);
    }
  }
  /* * ========================================== * HANDLE ICE CANDIDATE * ========================================== */ private async handleIceCandidate(
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    if (!this.peerConnection) {
      console.error('Peer connection does not exist');
      return;
    }
    /* * ICE candidates can arrive before * remoteDescription. */ if (
      !this.peerConnection.remoteDescription
    ) {
      this.pendingIceCandidates.push(candidate);
      console.log('ICE candidate queued');
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('ICE candidate added');
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }
  /* * ========================================== * FLUSH ICE CANDIDATES * ========================================== */ private async flushPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection) {
      return;
    }
    if (!this.peerConnection.remoteDescription) {
      return;
    }
    if (this.pendingIceCandidates.length === 0) {
      return;
    }
    console.log('Processing pending ICE candidates:', this.pendingIceCandidates.length);
    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Failed to add queued ICE candidate:', error);
      }
    }
    this.pendingIceCandidates = [];
    console.log('Pending ICE candidates processed');
  }
  /* * ========================================== * SEND SIGNALING MESSAGE * ========================================== */
  private sendSignalingMessage(message: SignalingMessage): void {
    if (!this.signalingSocket || this.signalingSocket.readyState !== WebSocket.OPEN) {
      console.warn('Signaling socket is not connected');
      return;
    }
    const payload: SignalingMessage = { ...message, roomId: this.roomId };
    this.signalingSocket.send(JSON.stringify(payload));
    console.log('Signaling message sent:', payload.type);
  }
  /* * ========================================== * MICROPHONE * ========================================== */
  muteMicrophone(): void {
    if (!this.localStream) {
      return;
    }

    const audioTrack = this.localStream.getAudioTracks()[0];

    if (!audioTrack) {
      return;
    }

    audioTrack.enabled = !audioTrack.enabled;

    this.microphoneEnabled = audioTrack.enabled;

    console.log('Local microphone:', this.microphoneEnabled ? 'enabled' : 'muted');

    this.sendMediaState();
  }
  /* * ========================================== * CAMERA * ========================================== */
  toggleCamera(): void {
    if (!this.localStream) {
      return;
    }

    const videoTrack = this.localStream.getVideoTracks()[0];

    if (!videoTrack) {
      return;
    }

    videoTrack.enabled = !videoTrack.enabled;

    this.cameraEnabled = videoTrack.enabled;

    console.log('Local camera:', this.cameraEnabled ? 'enabled' : 'disabled');

    this.sendMediaState();
  }
  /* * ========================================== * STOP CAMERA * ========================================== */ stopCamera(): void {
    if (!this.localStream) {
      return;
    }
    this.localStream.getVideoTracks().forEach((track) => track.stop());
    this.cameraEnabled = false;
    console.log('Camera stopped');
  }
  /* * ========================================== * CLEAR REMOTE VIDEO * ========================================== */
  private clearRemoteVideo(): void {
    this.ngZone.run(() => {
      this.remoteVideoPlaying = false;

      this.cdr.detectChanges();
    });

    if (!this.remoteVideo) {
      return;
    }

    this.remoteVideo.nativeElement.srcObject = null;
  }
  /* * ========================================== * RESET PEER CONNECTION * ========================================== */ private resetPeerConnection(): void {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = undefined;
    }
    this.pendingIceCandidates = [];
  }
  /* * ========================================== * STOP LOCAL MEDIA * ========================================== */ private stopLocalStream(): void {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = undefined;
    if (this.localVideo) {
      this.localVideo.nativeElement.srcObject = null;
    }
    this.microphoneEnabled = false;
    this.cameraEnabled = false;
  }
  /* * ========================================== * FULLSCREEN * ========================================== */ async toggleFullscreen(): Promise<void> {
    const element = document.documentElement;
    try {
      if (!document.fullscreenElement) {
        await element.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }
  /* * ========================================== * END CALL * ========================================== */
  endCall(): void {
    console.log('Ending video call...');

    /*
     * PC1 owns the browser session.
     */
    if (this.embedded) {
      this.sendSignalingMessage({
        type: 'session-ended',
      });
    }

    this.cleanupCall();

    /*
     * PC1 embedded call.
     */
    if (this.embedded) {
      this.callEnded.emit();

      return;
    }

    /*
     * PC2 manually leaves.
     */
    this.clearReconnectCredentials();

    this.router.navigateByUrl('/join-browser-session');
  }

  private async playRemoteVideo(videoElement: HTMLVideoElement): Promise<void> {
    try {
      await videoElement.play();

      console.log('Remote video playback started');

      this.ngZone.run(() => {
        this.connectionStatus = 'connected';
      });

      /*
       * Wait for the browser to finish
       * rendering the embedded panel.
       */

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const rect = videoElement.getBoundingClientRect();

          console.log('Remote video size:', rect.width, 'x', rect.height);

          window.dispatchEvent(new Event('resize'));
        });
      });
    } catch (error) {
      console.warn('Remote video playback failed:', error);
    }
  }

  private logVideoState(name: string, video: HTMLVideoElement): void {
    const rect = video.getBoundingClientRect();

    console.log(`[${name}] VIDEO STATE`, {
      width: rect.width,
      height: rect.height,

      videoWidth: video.videoWidth,

      videoHeight: video.videoHeight,

      readyState: video.readyState,

      paused: video.paused,

      ended: video.ended,

      muted: video.muted,

      autoplay: video.autoplay,

      srcObject: !!video.srcObject,
    });
  }
  private cleanupCall(): void {
    console.log('Cleaning up WebRTC call...');

    this.destroyed = true;

    /*
     * Stop camera + microphone
     */
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        console.log('Stopping local track:', track.kind);

        track.stop();
      });

      this.localStream = undefined;
    }

    /*
     * Remove local video
     */
    if (this.localVideo) {
      const localVideo = this.localVideo.nativeElement;

      localVideo.pause();

      localVideo.srcObject = null;
    }

    /*
     * Remove remote video
     */
    if (this.remoteVideo) {
      const remoteVideo = this.remoteVideo.nativeElement;

      remoteVideo.pause();

      remoteVideo.srcObject = null;
    }

    /*
     * Close WebRTC peer connection
     */
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;

      this.peerConnection.onicecandidate = null;

      this.peerConnection.onconnectionstatechange = null;

      this.peerConnection.oniceconnectionstatechange = null;

      this.peerConnection.close();

      this.peerConnection = undefined;

      console.log('Peer connection closed');
    }

    /*
     * Close signaling WebSocket
     */
    if (this.signalingSocket) {
      this.signalingSocket.onopen = null;

      this.signalingSocket.onmessage = null;

      this.signalingSocket.onerror = null;

      this.signalingSocket.onclose = null;

      if (
        this.signalingSocket.readyState === WebSocket.OPEN ||
        this.signalingSocket.readyState === WebSocket.CONNECTING
      ) {
        this.signalingSocket.close();
      }

      this.signalingSocket = undefined;

      console.log('Signaling socket closed');
    }

    /*
     * Remove queued ICE candidates
     */
    this.pendingIceCandidates = [];

    /*
     * Reset UI
     */
    this.ngZone.run(() => {
      this.remoteVideoPlaying = false;

      this.connectionStatus = 'disconnected';

      this.microphoneEnabled = false;

      this.cameraEnabled = false;

      this.cdr.detectChanges();
    });

    console.log('WebRTC call cleanup completed');
  }

  private sendMediaState(): void {
    this.sendSignalingMessage({
      type: 'media-state',

      data: {
        microphoneEnabled: this.microphoneEnabled,

        cameraEnabled: this.cameraEnabled,
      },
    });

    console.log('Local media state sent:', {
      microphoneEnabled: this.microphoneEnabled,

      cameraEnabled: this.cameraEnabled,
    });
  }

  private validateReconnectSession(): void {
    const storedSessionId = sessionStorage.getItem('remoteDeskSessionId');

    const participantToken = sessionStorage.getItem('remoteDeskParticipantToken');

    /*
     * PC2 must have both credentials.
     */
    if (!storedSessionId || !participantToken) {
      console.warn('Reconnect credentials are missing');

      this.handleInvalidReconnect();

      return;
    }

    /*
     * Prevent using credentials belonging
     * to another browser session URL.
     */
    if (storedSessionId !== this.roomId) {
      console.warn('Stored session does not match URL');

      this.handleInvalidReconnect();

      return;
    }

    console.log('Validating browser reconnect session...');

    this.browserSessionService.reconnectSession(storedSessionId, participantToken).subscribe({
      next: () => {
        if (this.destroyed) {
          return;
        }

        console.log('Browser reconnect session validated');

        /*
         * Only after backend validation do
         * we request camera/microphone access
         * and connect WebRTC.
         */
        this.initialize();
      },

      error: (error) => {
        console.error('Browser reconnect validation failed:', error);

        this.handleInvalidReconnect();
      },
    });
  }
  private handleInvalidReconnect(): void {
    console.log('Invalid reconnect session. Clearing credentials...');

    /*
     * Clear PC2 session credentials.
     */
    this.clearReconnectCredentials();

    /*
     * Prevent WebRTC initialization after
     * reconnect validation has failed.
     */
    this.destroyed = true;

    this.ngZone.run(() => {
      console.log('Redirecting to join-browser-session...');

      this.router
        .navigateByUrl('/join-browser-session')
        .then((success) => {
          console.log('Navigation result:', success);
        })
        .catch((error) => {
          console.error('Navigation failed:', error);
        });
    });
  }

  private clearReconnectCredentials(): void {
    sessionStorage.removeItem('remoteDeskSessionId');

    sessionStorage.removeItem('remoteDeskParticipantToken');

    sessionStorage.removeItem('remoteDeskPcId');

    console.log('Reconnect credentials cleared');
  }

  /* * ========================================== * DESTROY * ========================================== */

  ngOnDestroy(): void {
    console.log('VideoCall component destroyed');

    this.cleanupCall();
  }
}
