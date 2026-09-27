export type RemotePcStatus =
  | 'online'
  | 'offline';


/*
 * ========================================
 * REMOTE PC
 * ========================================
 */

export interface RemotePc {
  _id?: string;

  pcId: string;

  name: string;

  host: string;

  vncPort: number;

  isActive: boolean;

  status: RemotePcStatus;

  lastStatusCheck?: string;

  createdAt?: string;

  updatedAt?: string;
}


/*
 * ========================================
 * CREATE REMOTE PC REQUEST
 * ========================================
 */

export interface CreateRemotePcRequest {
  pcId: string;

  name: string;

  host: string;

  vncPort: number;
}


/*
 * ========================================
 * UPDATE REMOTE PC REQUEST
 * ========================================
 *
 * MongoDB _id is used to identify
 * the PC for update.
 */

export interface UpdateRemotePcRequest {
  _id: string;

  name?: string;

  host?: string;

  vncPort?: number;

  isActive?: boolean;
}


/*
 * ========================================
 * DELETE REMOTE PC REQUEST
 * ========================================
 */

export interface DeleteRemotePcRequest {
  _id: string;
}
