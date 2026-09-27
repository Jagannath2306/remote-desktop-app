import 'dotenv/config';

import fs from 'node:fs';
import https from 'node:https';

import app from './app';

import {
  connectDatabase
} from './config/database';

import {
  VncGatewayService
} from './services/vnc-gateway.service';

import {
  WebRtcSignalingService
} from './services/webrtc-signaling.service';


const PORT =
  Number(process.env.PORT) || 3000;


const vncGateway =
  new VncGatewayService();


const webRtcSignaling =
  new WebRtcSignalingService();


const startServer =
  async (): Promise<void> => {

    try {

      await connectDatabase();


      const httpsOptions = {

        key: fs.readFileSync(
          'cert/remote-desktop-key.pem'
        ),

        cert: fs.readFileSync(
          'cert/remote-desktop-cert.pem'
        ),

      };


      const server =
        https.createServer(
          httpsOptions,
          app
        );


      webRtcSignaling.initialize(
        server
      );


      server.listen(
        PORT,
        '0.0.0.0',
        () => {

          console.log(
            `Remote Desktop API running on https://0.0.0.0:${PORT}`
          );

          console.log(
            `WebRTC signaling running on wss://0.0.0.0:${PORT}/ws/signaling`
          );

        }
      );

    } catch (error) {

      console.error(
        'Failed to start server:',
        error
      );

      process.exit(1);
    }
  };


startServer();
