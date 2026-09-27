import { Request, Response } from "express";

import { BrowserSessionService } from "../services/browser-session.service";

const browserSessionService = new BrowserSessionService();

export const createBrowserSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { pcId } = req.body;

    if (!pcId) {
      res.status(400).json({
        success: false,
        message: "PC ID is required",
      });

      return;
    }

    const session = await browserSessionService.createSession(pcId);

    res.status(201).json({
      success: true,

      data: {
        sessionId: session.sessionId,

        pcId: session.pcId,

        joinCode: session.joinCode,

        hostToken: session.hostToken,

        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error("Create browser session failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create browser session",
    });
  }
};

export const joinBrowserSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { pcId, joinCode } = req.body;

    if (!pcId || !joinCode) {
      res.status(400).json({
        success: false,
        message: "PC ID and join code are required",
      });

      return;
    }

    const session = await browserSessionService.joinSession(
      pcId,
      String(joinCode),
    );

    if (!session) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });

      return;
    }

    res.status(200).json({
      success: true,

      data: {
        sessionId: session.sessionId,

        pcId: session.pcId,

        participantToken: session.participantToken,
      },
    });
  } catch (error) {
    console.error("Join browser session failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to join browser session",
    });
  }
};

export const endBrowserSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const sessionId = String(req.params["sessionId"]);

    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: "Session ID is required",
      });

      return;
    }

    const session = await browserSessionService.endSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        message: "Browser session not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message: "Browser session ended successfully",
    });
  } catch (error) {
    console.error("End browser session failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to end browser session",
    });
  }
};

export const reconnectBrowserSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { sessionId, participantToken } = req.body;

    if (!sessionId || !participantToken) {
      res.status(400).json({
        success: false,
        message: "Session ID and participant token are required",
      });

      return;
    }

    const session = await browserSessionService.reconnectSession(
      String(sessionId),
      String(participantToken),
    );

    if (!session) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired reconnect session",
      });

      return;
    }

    res.status(200).json({
      success: true,

      data: {
        sessionId: session.sessionId,

        pcId: session.pcId,
      },
    });
  } catch (error) {
    console.error("Reconnect browser session failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to reconnect browser session",
    });
  }
};
