export type DeviceType = 'router' | 'laptop' | 'desktop' | 'mobile' | 'tablet' | 'unknown';

export type DetectionConfidence = 'high' | 'probable' | 'low' | 'unknown';

export interface NetworkDevice {
  ip: string;
  mac: string;
  hostname: string;
  manufacturer: string;
  deviceType: DeviceType;
  confidence: DetectionConfidence;
  detectionMethod: string;
  openPorts: number[];
  status: 'online' | 'offline';
}

export interface NetworkDevicesResponse {
  totalDevices: number;
  devices: NetworkDevice[];
}
