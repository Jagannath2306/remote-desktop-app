declare module '@novnc/novnc' {
  export default class RFB {
    constructor(
      target: HTMLElement,
      connection: string,
      options?: {
        shared?: boolean;
        repeaterID?: string;
        credentials?: {
          username?: string;
          password?: string;
          target?: string;
        };
        wsProtocols?: string[];
      },
    );

    scaleViewport: boolean;
    resizeSession: boolean;
    viewOnly: boolean;

    addEventListener(type: string, listener: (event: any) => void): void;

    removeEventListener(type: string, listener: (event: any) => void): void;

    disconnect(): void;
    sendCtrlAltDel(): void;
    sendCredentials(credentials: { username?: string; password?: string; target?: string }): void;
  }
}
