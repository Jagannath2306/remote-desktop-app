export type BrowserSessionStatus =
  | 'waiting'
  | 'active'
  | 'ended';


/*
 * ==========================================
 * BROWSER SESSION
 * ==========================================
 */

export interface BrowserSession {

  sessionId: string;

  pcId: string;

  joinCode: string;

  expiresAt: string;

  status?: BrowserSessionStatus;
}


/*
 * ==========================================
 * CREATE SESSION
 * PC1 -> Backend
 * ==========================================
 */

export interface CreateBrowserSessionRequest {

  pcId: string;
}


export interface CreateBrowserSessionResponse {

  success: boolean;

  data: {
    sessionId: string;

    pcId: string;

    joinCode: string;

    expiresAt: string;
    
    hostToken: string;
  };
}


/*
 * ==========================================
 * JOIN SESSION
 * PC2 -> Backend
 * ==========================================
 */

export interface JoinBrowserSessionRequest {

  pcId: string;

  joinCode: string;
}


export interface JoinBrowserSessionResponse {

  success: boolean;

  data: {
    sessionId: string;

    pcId: string;

    participantToken: string;
  };
}


/*
 * ==========================================
 * RECONNECT SESSION
 * PC2 -> Backend
 * ==========================================
 */

export interface ReconnectBrowserSessionRequest {

  sessionId: string;

  participantToken: string;
}


export interface ReconnectBrowserSessionResponse {

  success: boolean;

  data: {
    sessionId: string;

    pcId: string;
  };
}


/*
 * ==========================================
 * END SESSION
 * PC1 -> Backend
 * ==========================================
 */

export interface EndBrowserSessionResponse {

  success: boolean;

  message: string;
}