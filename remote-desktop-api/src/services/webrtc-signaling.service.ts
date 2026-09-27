import { WebSocketServer, WebSocket } from "ws";
import { Server } from "node:http";
import { BrowserSession } from "../models/browser-session.model";

interface SignalingMessage {
  type: string;
  roomId?: string;
  data?: unknown;
}

interface JoinRoomData {
  role: "host" | "participant";

  hostToken?: string;

  participantToken?: string;
}
export class WebRtcSignalingService {
  private readonly rooms = new Map<string, Set<WebSocket>>();

  private wss?: WebSocketServer;

  initialize(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: "/ws/signaling",
    });

    this.wss.on("connection", (socket) => {
      console.log("WebRTC signaling client connected");

      let currentRoom: string | undefined;

      socket.on("message", async (message) => {
        try {
          const parsed = JSON.parse(message.toString()) as SignalingMessage;

          const { type, roomId, data } = parsed;

          // Join a room
          if (type === "join-room" && roomId) {
            const joinData = data as JoinRoomData;

            console.log("Signaling room join request:", {
              roomId,
              role: joinData?.role,
            });

            const authorized = await this.validateRoomJoin(roomId, joinData);

            if (!authorized) {
              console.warn("Unauthorized signaling room join:", {
                roomId,
                role: joinData?.role,
              });

              socket.send(
                JSON.stringify({
                  type: "room-unauthorized",

                  roomId,
                }),
              );

              return;
            }

            /*
             * Only set currentRoom AFTER
             * authorization succeeds.
             */
            currentRoom = roomId;

            if (!this.rooms.has(roomId)) {
              this.rooms.set(roomId, new Set());
            }

            const room = this.rooms.get(roomId)!;

            const isFirstClient = room.size === 0;

            room.add(socket);

            socket.send(
              JSON.stringify({
                type: "room-joined",

                roomId,

                data: {
                  isFirstClient,
                },
              }),
            );

            this.broadcast(room, socket, {
              type: "peer-joined",

              roomId,
            });

            console.log(`Authorized signaling client joined room: ${roomId}`);

            return;
          }

          // Forward WebRTC messages
          // to the other peer.
          if (currentRoom && this.rooms.has(currentRoom)) {
            const room = this.rooms.get(currentRoom)!;

            this.broadcast(room, socket, {
              type,
              roomId: currentRoom,
              data,
            });
          }
        } catch (error) {
          console.error("Invalid signaling message:", error);
        }
      });

      socket.on("close", () => {
        console.log("WebRTC signaling client disconnected");

        if (!currentRoom) {
          return;
        }

        const room = this.rooms.get(currentRoom);

        if (!room) {
          return;
        }

        room.delete(socket);

        this.broadcast(room, socket, {
          type: "peer-left",
          roomId: currentRoom,
        });

        if (room.size === 0) {
          this.rooms.delete(currentRoom);
        }
      });
    });

    console.log("WebRTC signaling server initialized");
  }

  private broadcast(
    room: Set<WebSocket>,
    sender: WebSocket,
    message: SignalingMessage,
  ): void {
    const payload = JSON.stringify(message);

    for (const client of room) {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
  private async validateRoomJoin(
    roomId: string,
    data: JoinRoomData,
  ): Promise<boolean> {
    /*
     * =====================================
     * HOST / PC1
     * =====================================
     */

    if (data.role === "host" && data.hostToken) {
      const session = await BrowserSession.findOne({
        sessionId: roomId,

        hostToken: data.hostToken,

        status: {
          $in: ["waiting", "active"],
        },

        expiresAt: {
          $gt: new Date(),
        },
      });

      return !!session;
    }

    /*
     * =====================================
     * PARTICIPANT / PC2
     * =====================================
     */

    if (data.role === "participant" && data.participantToken) {
      const session = await BrowserSession.findOne({
        sessionId: roomId,

        participantToken: data.participantToken,

        status: "active",

        expiresAt: {
          $gt: new Date(),
        },
      });

      return !!session;
    }

    return false;
  }
}
