import { Router } from "express";

import { PcController } from "../controllers/pc.controller";

const router = Router();

const pcController = new PcController();

/*
 * ========================================
 * GET ALL PCS
 * ========================================
 *
 * GET /api/remote-pcs
 */
router.get("/", pcController.getAll);

/*
 * ========================================
 * CHECK PC STATUS
 * ========================================
 *
 * GET /api/remote-pcs/status
 *
 * IMPORTANT:
 * This route MUST be before /:pcId.
 */
router.get("/status", pcController.checkStatus);

/*
 * ========================================
 * GET ONE PC
 * ========================================
 *
 * GET /api/remote-pcs/:pcId
 */
router.get("/:pcId", pcController.getByPcId);

/*
 * ========================================
 * CREATE PC
 * ========================================
 *
 * POST /api/remote-pcs/add
 */
router.post("/add", pcController.create);

/*
 * ========================================
 * UPDATE PC
 * ========================================
 *
 * PUT /api/remote-pcs/:pcId
 */
router.patch("/update", pcController.update);

/*
 * ========================================
 * DELETE PC
 * ========================================
 *
 * DELETE /api/remote-pcs/:pcId
 */
router.delete( "/delete", pcController.delete );

export default router;
