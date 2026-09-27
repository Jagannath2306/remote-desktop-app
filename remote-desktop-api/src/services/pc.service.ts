import net from "node:net";

import { RemotePc, RemotePcStatus } from "../models/remote-pc.model";

/*
 * ========================================
 * CREATE PC DTO
 * ========================================
 */

export interface CreatePcDto {
  pcId: string;
  name: string;
  host: string;
  vncPort: number;
}

/*
 * ========================================
 * UPDATE PC DTO
 * ========================================
 */

export interface UpdatePcDto {
  name?: string;
  host?: string;
  vncPort?: number;
  isActive?: boolean;
}

/*
 * ========================================
 * PC SERVICE
 * ========================================
 */

export class PcService {
  /*
   * ========================================
   * GET PC BY PC ID
   * ========================================
   *
   * Used by VNC Gateway.
   *
   * Only active PCs are returned.
   */

  async getByPcId(pcId: string) {
    return RemotePc.findOne({
      pcId,
      isActive: true,
    });
  }

  /*
   * ========================================
   * GET PC BY PC ID FOR MANAGEMENT
   * ========================================
   *
   * Used by management APIs.
   *
   * Unlike getByPcId(), this method
   * also returns inactive PCs.
   */

  async getByPcIdForManagement(pcId: string) {
    return RemotePc.findOne({
      pcId,
    });
  }

  /*
   * ========================================
   * GET PC BY MONGODB _id
   * ========================================
   *
   * Used when update/delete operations
   * use MongoDB _id.
   */

  async getByIdForManagement(_id: string) {
    return RemotePc.findById(_id);
  }

  /*
   * ========================================
   * GET ALL PCs
   * ========================================
   */

  async getAll() {
    return RemotePc.find().sort({
      createdAt: -1,
    });
  }

  /*
   * ========================================
   * CREATE PC
   * ========================================
   */

  async create(data: CreatePcDto) {
    const existingPc = await RemotePc.findOne({
      pcId: data.pcId,
    });

    if (existingPc) {
      throw new Error(`PC with ID ${data.pcId} already exists`);
    }

    return RemotePc.create({
      pcId: data.pcId,
      name: data.name,
      host: data.host,
      vncPort: data.vncPort,
      isActive: true,
      status: "offline",
    });
  }

  /*
   * ========================================
   * UPDATE PC BY MONGODB _id
   * ========================================
   */

  async updateById(_id: string, data: UpdatePcDto) {
    return RemotePc.findByIdAndUpdate(
      _id,
      {
        $set: data,
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  /*
   * ========================================
   * DELETE PC BY MONGODB _id
   * ========================================
   */

  async deleteById(_id: string) {
    return RemotePc.findByIdAndDelete(_id);
  }

  /*
   * ========================================
   * CHECK VNC AVAILABILITY
   * ========================================
   */

  async checkAvailability(
    host: string,
    port: number,
    timeout = 2000,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const socket = new net.Socket();

      let resolved = false;

      const finish = (available: boolean): void => {
        if (resolved) {
          return;
        }

        resolved = true;

        socket.destroy();

        resolve(available);
      };

      socket.connect(port, host, () => {
        finish(true);
      });

      socket.on("error", () => {
        finish(false);
      });

      socket.setTimeout(timeout, () => {
        finish(false);
      });
    });
  }

  /*
   * ========================================
   * CHECK SINGLE PC STATUS
   * ========================================
   */

  async checkPcStatus(pcId: string) {
    const pc = await RemotePc.findOne({
      pcId,
      isActive: true,
    });

    if (!pc) {
      return null;
    }

    const isOnline = await this.checkAvailability(pc.host, pc.vncPort);

    const status: RemotePcStatus = isOnline ? "online" : "offline";

    pc.status = status;

    pc.lastStatusCheck = new Date();

    await pc.save();

    return pc;
  }

  /*
   * ========================================
   * CHECK ALL PC STATUS
   * ========================================
   */

  async checkAllPcStatus() {
    const pcs = await RemotePc.find({
      isActive: true,
    });

    await Promise.all(
      pcs.map(async (pc) => {
        const isOnline = await this.checkAvailability(pc.host, pc.vncPort);

        pc.status = isOnline ? "online" : "offline";

        pc.lastStatusCheck = new Date();

        await pc.save();
      }),
    );

    return RemotePc.find().sort({
      createdAt: -1,
    });
  }
}
