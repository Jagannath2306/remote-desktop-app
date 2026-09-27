import { Request, Response } from "express";

import { NetworkService } from "../services/network.service";

export class NetworkController {
  private readonly networkService = new NetworkService();

  getDevices = async (_req: Request, res: Response): Promise<void> => {
    try {
      const devices = await this.networkService.discoverDevices();

      res.status(200).json({
        success: true,

        data: {
          totalDevices: devices.length,

          devices,
        },
      });
    } catch (error) {
      console.error("Failed to discover network devices:", error);

      res.status(500).json({
        success: false,

        message: "Failed to discover network devices",
      });
    }
  };
}
