import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';

import { CommonModule } from '@angular/common';

import { Subscription, interval, startWith, switchMap } from 'rxjs';

import { NetworkService } from '../../services/network.service';
import { NetworkDevice } from '../../models/network-device.model';

@Component({
  selector: 'app-network-devices',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './network-devices.html',
  styleUrl: './network-devices.css',
})
export class NetworkDevices implements OnInit, OnDestroy {
  private readonly networkService = inject(NetworkService);

  private readonly cdr = inject(ChangeDetectorRef);

  devices: NetworkDevice[] = [];

  filteredDevices: NetworkDevice[] = [];

  totalDevices = 0;

  loading = false;

  refreshing = false;

  errorMessage = '';

  searchText = '';

  selectedDeviceType: 'all' | 'router' | 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'unknown' =
    'all';

  private refreshSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.loadDevices();

    /*
     * Automatically refresh every 10 seconds.
     */
    this.refreshSubscription = interval(10000)
      .pipe(
        startWith(10000),
        switchMap(() => this.networkService.getDevices()),
      )
      .subscribe({
        next: (response) => {
          this.devices = response.data.devices;

          this.totalDevices = response.data.totalDevices;

          this.applyFilters();

          this.loading = false;

          this.refreshing = false;

          this.errorMessage = '';

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error('Failed to load network devices:', error);

          this.loading = false;

          this.refreshing = false;

          this.errorMessage = 'Unable to discover network devices.';

          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  /*
   * ---------------------------------------------------------
   * LOAD DEVICES
   * ---------------------------------------------------------
   */

  loadDevices(): void {
    this.loading = true;

    this.errorMessage = '';

    this.networkService.getDevices().subscribe({
      next: (response) => {
        this.devices = response.data.devices;

        this.totalDevices = response.data.totalDevices;

        this.applyFilters();

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Failed to load network devices:', error);

        this.loading = false;

        this.errorMessage = 'Unable to discover network devices.';

        this.cdr.detectChanges();
      },
    });
  }

  /*
   * ---------------------------------------------------------
   * MANUAL REFRESH
   * ---------------------------------------------------------
   */

  refresh(): void {
    if (this.refreshing) {
      return;
    }

    this.refreshing = true;

    this.errorMessage = '';

    this.networkService.getDevices().subscribe({
      next: (response) => {
        this.devices = response.data.devices;

        this.totalDevices = response.data.totalDevices;

        this.applyFilters();

        this.refreshing = false;

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Failed to refresh network devices:', error);

        this.refreshing = false;

        this.errorMessage = 'Failed to refresh network devices.';

        this.cdr.detectChanges();
      },
    });
  }

  /*
   * ---------------------------------------------------------
   * FILTER
   * ---------------------------------------------------------
   */

  applyFilters(): void {
    const search = this.searchText.trim().toLowerCase();

    this.filteredDevices = this.devices.filter((device) => {
      const matchesType =
        this.selectedDeviceType === 'all' || device.deviceType === this.selectedDeviceType;

      if (!matchesType) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        device.ip.toLowerCase().includes(search) ||
        device.mac.toLowerCase().includes(search) ||
        device.hostname.toLowerCase().includes(search) ||
        device.manufacturer.toLowerCase().includes(search) ||
        device.deviceType.toLowerCase().includes(search)
      );
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchText = input.value;

    this.applyFilters();
  }

  onDeviceTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.selectedDeviceType = select.value as
      'all' | 'router' | 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'unknown';

    this.applyFilters();
  }

  clearFilters(): void {
    this.searchText = '';

    this.selectedDeviceType = 'all';

    this.applyFilters();
  }

  /*
   * ---------------------------------------------------------
   * DEVICE COUNTS
   * ---------------------------------------------------------
   */

  getDeviceCount(type: 'router' | 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'unknown'): number {
    return this.devices.filter((device) => device.deviceType === type).length;
  }

  /*
   * ---------------------------------------------------------
   * UI HELPERS
   * ---------------------------------------------------------
   */

  getDeviceIcon(type: string): string {
    switch (type) {
      case 'router':
        return '📡';

      case 'desktop':
        return '🖥️';

      case 'laptop':
        return '💻';

      case 'mobile':
        return '📱';

      case 'tablet':
        return '📟';

      default:
        return '❓';
    }
  }

  getDeviceTypeLabel(type: string): string {
    switch (type) {
      case 'router':
        return 'Router';

      case 'desktop':
        return 'Desktop';

      case 'laptop':
        return 'Laptop';

      case 'mobile':
        return 'Mobile';

      case 'tablet':
        return 'Tablet';

      default:
        return 'Unknown';
    }
  }

  getConfidenceLabel(confidence: string): string {
    switch (confidence) {
      case 'high':
        return 'High';

      case 'probable':
        return 'Probable';

      case 'low':
        return 'Low';

      default:
        return 'Unknown';
    }
  }

  getConfidenceClass(confidence: string): string {
    switch (confidence) {
      case 'high':
        return 'confidence-high';

      case 'probable':
        return 'confidence-probable';

      case 'low':
        return 'confidence-low';

      default:
        return 'confidence-unknown';
    }
  }

  getPorts(ports: number[]): string {
    if (!ports || ports.length === 0) {
      return 'None detected';
    }

    return ports.join(', ');
  }
}
