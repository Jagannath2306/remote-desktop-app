import net from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';
import { PcService } from './pc.service';

export class VncGatewayService {

  private readonly wsServer: WebSocketServer;
  private readonly pcService: PcService;

  constructor() {

    this.pcService = new PcService();

    this.wsServer = new WebSocketServer({
      port: 6080
    });

    this.wsServer.on('connection', async (ws, request) => {

      console.log('VNC WebSocket client connected');

      try {

        const url = new URL(
          request.url || '',
          'ws://localhost:6080'
        );

        // Example:
        // ws://localhost:6080/vnc/pc-001
        const pcId = url.pathname.split('/').pop();

        if (!pcId) {
          console.error('PC ID is missing');
          ws.close();
          return;
        }

        // Get PC details from MongoDB
        const remotePc = await this.pcService.getByPcId(pcId);

        if (!remotePc) {
          console.error(`PC not found: ${pcId}`);
          ws.close();
          return;
        }

        console.log(
          `Connecting to ${remotePc.name} ` +
          `(${remotePc.host}:${remotePc.vncPort})`
        );

        this.connectToVncServer(
          ws,
          remotePc.host,
          remotePc.vncPort,
          remotePc.name
        );

      } catch (error) {

        console.error(
          'Failed to establish VNC connection:',
          error
        );

        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
    });

    console.log('VNC Gateway listening on port 6080');
  }

  private connectToVncServer(
    ws: WebSocket,
    host: string,
    port: number,
    pcName: string
  ): void {

    const vncSocket = new net.Socket();

    // Gateway → VNC Server
    vncSocket.connect(
      port,
      host,
      () => {
        console.log(
          `Connected to ${pcName} VNC server`
        );
      }
    );

    // Browser → VNC Server
    ws.on('message', (data) => {

      if (vncSocket.destroyed) {
        return;
      }

      let buffer: Buffer;

      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (data instanceof ArrayBuffer) {
        buffer = Buffer.from(data);
      } else {
        buffer = Buffer.concat(data);
      }

      vncSocket.write(buffer);
    });

    // VNC Server → Browser
    vncSocket.on('data', (data) => {

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // Browser disconnected
    ws.on('close', () => {

      console.log(
        `VNC WebSocket disconnected: ${pcName}`
      );

      if (!vncSocket.destroyed) {
        vncSocket.destroy();
      }
    });

    // WebSocket error
    ws.on('error', (error) => {

      console.error(
        `WebSocket error for ${pcName}:`,
        error.message
      );

      if (!vncSocket.destroyed) {
        vncSocket.destroy();
      }
    });

    // VNC TCP error
    vncSocket.on('error', (error) => {

      console.error(
        `VNC TCP error for ${pcName}:`,
        error.message
      );

      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    // VNC connection closed
    vncSocket.on('close', () => {

      console.log(
        `VNC connection closed: ${pcName}`
      );

      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
  }
}