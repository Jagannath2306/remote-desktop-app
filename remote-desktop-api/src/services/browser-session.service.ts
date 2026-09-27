import crypto from "node:crypto";

import { BrowserSession } from "../models/browser-session.model";

export class BrowserSessionService {
  async createSession(pcId: string) {
    /*
     * End any previous waiting/active
     * browser session for this PC.
     */
    await BrowserSession.updateMany(
      {
        pcId,
        status: {
          $in: ["waiting", "active"],
        },
      },
      {
        $set: {
          status: "ended",
        },
      },
    );

    const sessionId = crypto.randomUUID();

    /*
     * Six-digit code.
     */
    const joinCode = crypto.randomInt(100000, 1000000).toString();

    /*
     * Session valid for 10 minutes.
     */
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const hostToken = crypto.randomBytes(32).toString("hex");

    return BrowserSession.create({
      sessionId,
      pcId,
      joinCode,
      hostToken,
      status: "waiting",
      expiresAt,
    });
  }

  async joinSession(pcId: string, joinCode: string) {
    /*
     * Join code can only be used for
     * the initial connection.
     */
    const session = await BrowserSession.findOne({
      pcId,
      joinCode,

      status: "waiting",

      expiresAt: {
        $gt: new Date(),
      },
    });

    if (!session) {
      return null;
    }

    /*
     * Generate a secure token that PC2
     * can use for reconnection.
     */
    const participantToken = crypto.randomBytes(32).toString("hex");

    session.status = "active";

    session.participantToken = participantToken;

    await session.save();

    return session;
  }

  async endSession(sessionId: string) {
    return BrowserSession.findOneAndUpdate(
      {
        sessionId,
      },
      {
        $set: {
          status: "ended",
        },
      },
      {
        new: true,
      },
    );
  }
  async reconnectSession(sessionId: string, participantToken: string) {
    const session = await BrowserSession.findOne({
      sessionId,

      participantToken,

      status: "active",

      expiresAt: {
        $gt: new Date(),
      },
    });

    return session;
  }
}
