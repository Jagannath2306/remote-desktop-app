import { Schema, model, Document } from "mongoose";

/*
 * ==========================================
 * PC STATUS
 * ==========================================
 */

export type RemotePcStatus = "online" | "offline";

/*
 * ==========================================
 * INTERFACE
 * ==========================================
 */

export interface IRemotePc extends Document {
  pcId: string;

  name: string;

  host: string;

  vncPort: number;

  /*
   * Whether this PC record is enabled.
   *
   * This is NOT the actual online status.
   */
  isActive: boolean;

  /*
   * Actual current availability.
   */
  status: RemotePcStatus;

  /*
   * Last time the PC status was checked.
   */
  lastStatusCheck?: Date;
}

/*
 * ==========================================
 * SCHEMA
 * ==========================================
 */

const remotePcSchema = new Schema<IRemotePc>(
  {
    pcId: {
      type: String,

      required: true,

      unique: true,

      trim: true,
    },

    name: {
      type: String,

      required: true,

      trim: true,
    },

    host: {
      type: String,

      required: true,

      trim: true,
    },

    vncPort: {
      type: Number,

      required: true,

      default: 5900,

      min: 1,

      max: 65535,
    },

    /*
     * Record enabled/disabled.
     */
    isActive: {
      type: Boolean,

      default: true,
    },

    /*
     * Real PC availability.
     */
    status: {
      type: String,

      enum: ["online", "offline"],

      default: "offline",
    },

    /*
     * Last health check.
     */
    lastStatusCheck: {
      type: Date,
    },
  },

  {
    timestamps: true,
  },
);

export const RemotePc = model<IRemotePc>("RemotePc", remotePcSchema);
