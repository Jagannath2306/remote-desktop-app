import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  CreateBrowserSessionRequest,
  CreateBrowserSessionResponse,
  JoinBrowserSessionRequest,
  JoinBrowserSessionResponse,
  ReconnectBrowserSessionRequest,
  ReconnectBrowserSessionResponse,
  EndBrowserSessionResponse,
} from '../models/browser-session.model';

@Injectable({
  providedIn: 'root',
})
export class BrowserSessionService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiUrl}/browser-sessions`;

  createSession(pcId: string): Observable<CreateBrowserSessionResponse> {
    const request: CreateBrowserSessionRequest = {
      pcId,
    };

    return this.http.post<CreateBrowserSessionResponse>(this.baseUrl, request);
  }

  joinSession(pcId: string, joinCode: string): Observable<JoinBrowserSessionResponse> {
    const request: JoinBrowserSessionRequest = {
      pcId,
      joinCode,
    };

    return this.http.post<JoinBrowserSessionResponse>(`${this.baseUrl}/join`, request);
  }

  reconnectSession(
    sessionId: string,
    participantToken: string,
  ): Observable<ReconnectBrowserSessionResponse> {
    const request: ReconnectBrowserSessionRequest = {
      sessionId,
      participantToken,
    };

    return this.http.post<ReconnectBrowserSessionResponse>(`${this.baseUrl}/reconnect`, request);
  }

  endSession(sessionId: string): Observable<EndBrowserSessionResponse> {
    return this.http.patch<EndBrowserSessionResponse>(`${this.baseUrl}/${sessionId}/end`, {});
  }
}
