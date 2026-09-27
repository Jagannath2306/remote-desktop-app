import { Router } from "express";

import { NetworkController } from "../controllers/network.controller";

const router = Router();

const networkController = new NetworkController();

router.get("/devices", networkController.getDevices);

export default router;
