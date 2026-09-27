import { Schema, model, Document } from "mongoose";

export interface IBrowserSession extends Document {
  sessionId: string;

  pcId: string;

  joinCode: string;

  status: "waiting" | "active" | "ended";

  expiresAt: Date;

  participantToken?: string;
  hostToken?: string;
}

const browserSessionSchema = new Schema<IBrowserSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },

    pcId: {
      type: String,
      required: true,
      index: true,
    },

    joinCode: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["waiting", "active", "ended"],
      default: "waiting",
    },
    participantToken: {
      type: String,
    },
    hostToken: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Automatically remove expired sessions.
 */
browserSessionSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

export const BrowserSession = model<IBrowserSession>(
  "BrowserSession",
  browserSessionSchema,
);
