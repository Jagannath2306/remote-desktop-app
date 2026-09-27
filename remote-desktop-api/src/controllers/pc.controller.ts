import { Request, Response } from "express";

import { PcService } from "../services/pc.service";

export class PcController {
  private readonly pcService: PcService;

  constructor() {
    this.pcService = new PcService();
  }

  /*
   * ========================================
   * GET ALL PCS
   * ========================================
   *
   * GET /api/remote-pcs
   */

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const pcs = await this.pcService.getAll();

      res.status(200).json({
        success: true,

        data: pcs,
      });
    } catch (error) {
      console.error("Failed to get PCs:", error);

      res.status(500).json({
        success: false,

        message: "Failed to get remote PCs",
      });
    }
  };

  /*
   * ========================================
   * GET ONE PC
   * ========================================
   *
   * GET /api/remote-pcs/:pcId
   *
   * Used by Management UI.
   *
   * This can return inactive PCs too.
   */

  getByPcId = async (
    req: Request<{ pcId: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      const { pcId } = req.params;

      const pc = await this.pcService.getByPcIdForManagement(pcId);

      if (!pc) {
        res.status(404).json({
          success: false,

          message: `Remote PC '${pcId}' not found`,
        });

        return;
      }

      res.status(200).json({
        success: true,

        data: pc,
      });
    } catch (error) {
      console.error("Failed to get PC:", error);

      res.status(500).json({
        success: false,

        message: "Failed to get remote PC",
      });
    }
  };

  /*
   * ========================================
   * CREATE PC
   * ========================================
   *
   * POST /api/remote-pcs/add
   */

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pcId, name, host, vncPort } = req.body;

      /*
       * Validate required fields.
       */

      if (typeof pcId !== "string" || !pcId.trim()) {
        res.status(400).json({
          success: false,

          message: "pcId is required",
        });

        return;
      }

      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({
          success: false,

          message: "name is required",
        });

        return;
      }

      if (typeof host !== "string" || !host.trim()) {
        res.status(400).json({
          success: false,

          message: "host is required",
        });

        return;
      }

      /*
       * VNC port.
       *
       * Default = 5900.
       */

      const port =
        vncPort === undefined || vncPort === null || vncPort === ""
          ? 5900
          : Number(vncPort);

      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        res.status(400).json({
          success: false,

          message: "vncPort must be between 1 and 65535",
        });

        return;
      }

      /*
       * Check duplicate PC ID.
       */

      const existingPc = await this.pcService.getByPcIdForManagement(
        pcId.trim(),
      );

      if (existingPc) {
        res.status(409).json({
          success: false,

          message: `PC with ID '${pcId}' already exists`,
        });

        return;
      }

      const pc = await this.pcService.create({
        pcId: pcId.trim(),

        name: name.trim(),

        host: host.trim(),

        vncPort: port,
      });

      res.status(201).json({
        success: true,

        message: "Remote PC created successfully",

        data: pc,
      });
    } catch (error) {
      console.error("Failed to create PC:", error);

      res.status(500).json({
        success: false,

        message: "Failed to create remote PC",
      });
    }
  };

  /*
   * ========================================
   * UPDATE PC
   * ========================================
   *
   * PUT /api/remote-pcs/update
   */

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { _id, name, host, vncPort, isActive } = req.body;

      /*
       * Validate MongoDB ID
       */

      if (typeof _id !== "string" || !_id.trim()) {
        res.status(400).json({
          success: false,
          message: "_id is required",
        });

        return;
      }

      /*
       * Check whether PC exists.
       */

      const existingPc = await this.pcService.getByIdForManagement(_id);

      if (!existingPc) {
        res.status(404).json({
          success: false,
          message: `Remote PC '${_id}' not found`,
        });

        return;
      }

      /*
       * Build update object.
       */

      const updateData: {
        name?: string;
        host?: string;
        vncPort?: number;
        isActive?: boolean;
      } = {};

      /*
       * Validate name.
       */

      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          res.status(400).json({
            success: false,
            message: "name must be a non-empty string",
          });

          return;
        }

        updateData.name = name.trim();
      }

      /*
       * Validate host.
       */

      if (host !== undefined) {
        if (typeof host !== "string" || !host.trim()) {
          res.status(400).json({
            success: false,
            message: "host must be a non-empty string",
          });

          return;
        }

        updateData.host = host.trim();
      }

      /*
       * Validate VNC port.
       */

      if (vncPort !== undefined) {
        const port = Number(vncPort);

        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          res.status(400).json({
            success: false,
            message: "vncPort must be between 1 and 65535",
          });

          return;
        }

        updateData.vncPort = port;
      }

      /*
       * Validate active flag.
       */

      if (isActive !== undefined) {
        if (typeof isActive !== "boolean") {
          res.status(400).json({
            success: false,
            message: "isActive must be a boolean",
          });

          return;
        }

        updateData.isActive = isActive;
      }

      /*
       * Nothing to update.
       */

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          message: "No fields provided for update",
        });

        return;
      }

      const updatedPc = await this.pcService.updateById(_id, updateData);

      res.status(200).json({
        success: true,
        message: "Remote PC updated successfully",
        data: updatedPc,
      });
    } catch (error) {
      console.error("Failed to update PC:", error);

      res.status(500).json({
        success: false,
        message: "Failed to update remote PC",
      });
    }
  };

/*
 * ========================================
 * DELETE PC
 * ========================================
 *
 * DELETE /api/remote-pcs/delete
 */

delete = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { _id } = req.body;

    /*
     * Validate MongoDB ID
     */

    if (
      typeof _id !== "string" ||
      !_id.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "_id is required",
      });

      return;
    }

    const deletedPc =
      await this.pcService.deleteById(
        _id
      );

    if (!deletedPc) {
      res.status(404).json({
        success: false,
        message: `Remote PC '${_id}' not found`,
      });

      return;
    }

    res.status(200).json({
      success: true,
      message: "Remote PC deleted successfully",
      data: deletedPc,
    });
  } catch (error) {
    console.error(
      "Failed to delete PC:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to delete remote PC",
    });
  }
};

  /*
   * ========================================
   * CHECK ALL PC STATUS
   * ========================================
   *
   * GET /api/remote-pcs/status
   */

  checkStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
      const pcs = await this.pcService.checkAllPcStatus();

      res.status(200).json({
        success: true,

        data: pcs,
      });
    } catch (error) {
      console.error("Failed to check PC status:", error);

      res.status(500).json({
        success: false,

        message: "Failed to check PC status",
      });
    }
  };
}
