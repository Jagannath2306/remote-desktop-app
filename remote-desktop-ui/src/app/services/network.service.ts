import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { NetworkDevicesResponse } from '../models/network-device.model';
import { environment } from '../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;

  message?: string;

  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class NetworkService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiUrl}/network`;

  getDevices(): Observable<ApiResponse<NetworkDevicesResponse>> {
    return this.http.get<ApiResponse<NetworkDevicesResponse>>(`${this.baseUrl}/devices`);
  }
}
