import { Router } from "express";

import {
  createBrowserSession,
  endBrowserSession,
  joinBrowserSession,
  reconnectBrowserSession,
} from "../controllers/browser-session.controller";

const router = Router();

router.post("/", createBrowserSession);

router.post("/join", joinBrowserSession);
router.patch("/:sessionId/end", endBrowserSession);
router.post("/reconnect", reconnectBrowserSession);

export default router;
