import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import {
  CreateRemotePcRequest,
  DeleteRemotePcRequest,
  RemotePc,
  UpdateRemotePcRequest,
} from '../models/remote-pc.model';
import { environment } from '../../environments/environment';

/*
 * ========================================
 * API RESPONSE
 * ========================================
 */

export interface ApiResponse<T> {
  success: boolean;

  message?: string;

  data: T;
}

/*
 * ========================================
 * PC SERVICE
 * ========================================
 */

@Injectable({
  providedIn: 'root',
})
export class PcService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiUrl}/remote-pcs`;

  /*
   * ========================================
   * GET ALL REMOTE PCs
   * ========================================
   */

  getAll(): Observable<ApiResponse<RemotePc[]>> {
    return this.http.get<ApiResponse<RemotePc[]>>(this.baseUrl);
  }

  /*
   * ========================================
   * GET PC BY PC ID
   * ========================================
   */

  getByPcId(pcId: string): Observable<ApiResponse<RemotePc>> {
    return this.http.get<ApiResponse<RemotePc>>(`${this.baseUrl}/${pcId}`);
  }

  /*
   * ========================================
   * CHECK PC STATUS
   * ========================================
   */

  checkStatus(): Observable<ApiResponse<RemotePc[]>> {
    return this.http.get<ApiResponse<RemotePc[]>>(`${this.baseUrl}/status`);
  }

  /*
   * ========================================
   * CREATE REMOTE PC
   * ========================================
   *
   * POST /api/remote-pcs/add
   */

  create(data: CreateRemotePcRequest): Observable<ApiResponse<RemotePc>> {
    return this.http.post<ApiResponse<RemotePc>>(`${this.baseUrl}/add`, data);
  }

  /*
   * ========================================
   * UPDATE REMOTE PC
   * ========================================
   *
   * PUT /api/remote-pcs/update
   *
   * _id is sent in request body.
   */

  update(data: UpdateRemotePcRequest): Observable<ApiResponse<RemotePc>> {
    return this.http.patch<ApiResponse<RemotePc>>(`${this.baseUrl}/update`, data);
  }

  /*
   * ========================================
   * DELETE REMOTE PC
   * ========================================
   *
   * DELETE /api/remote-pcs/delete
   *
   * _id is sent in request body.
   */

  delete(data: DeleteRemotePcRequest): Observable<ApiResponse<RemotePc>> {
    return this.http.delete<ApiResponse<RemotePc>>(`${this.baseUrl}/delete`, {
      body: data,
    });
  }
}
