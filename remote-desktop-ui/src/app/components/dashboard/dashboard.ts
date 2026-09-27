import { Component, ChangeDetectorRef, OnInit, OnDestroy, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexPlotOptions,
  ApexXAxis,
  ApexYAxis,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexTooltip,
} from 'ng-apexcharts';

import { Subscription, interval, switchMap } from 'rxjs';

import { NetworkService } from '../../services/network.service';
import { NetworkDevice } from '../../models/network-device.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,

  imports: [CommonModule, RouterLink, ChartComponent],

  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly networkService = inject(NetworkService);

  private readonly cdr = inject(ChangeDetectorRef);

  private refreshSubscription?: Subscription;

  // =========================================================
  // NETWORK STATISTICS
  // =========================================================

  networkDeviceCount = 0;

  computerCount = 0;

  mobileDeviceCount = 0;

  routerCount = 0;

  onlineDeviceCount = 0;

  offlineDeviceCount = 0;

  // =========================================================
  // RECENT DEVICES
  // =========================================================

  recentDevices: NetworkDevice[] = [];

  // =========================================================
  // DONUT CHART
  // =========================================================

  donutSeries: ApexNonAxisChartSeries = [0, 0, 0, 0, 0, 0];

  donutLabels: string[] = ['Router', 'Desktop', 'Laptop', 'Mobile', 'Tablet', 'Unknown'];

  donutChart: ApexChart = {
    type: 'donut',
    height: 320,

    toolbar: {
      show: false,
    },
  };

  donutColors: string[] = ['#08cdbd', '#4f46e5', '#0ea5e9', '#f59e0b', '#8b5cf6', '#94a3b8'];

  donutLegend: ApexLegend = {
    position: 'bottom',
    horizontalAlign: 'center',

    fontSize: '12px',
  };

  donutDataLabels: ApexDataLabels = {
    enabled: true,
  };

  donutTooltip: ApexTooltip = {
    enabled: true,
  };

  donutResponsive: ApexResponsive[] = [
    {
      breakpoint: 480,

      options: {
        chart: {
          width: 300,
        },

        legend: {
          position: 'bottom',
        },
      },
    },
  ];

  // =========================================================
  // BAR CHART
  // =========================================================

  barSeries: ApexAxisChartSeries = [
    {
      name: 'Devices',

      data: [0, 0, 0, 0, 0, 0],
    },
  ];

  barChart: ApexChart = {
    type: 'bar',
    height: 320,

    toolbar: {
      show: false,
    },
  };

  barPlotOptions: ApexPlotOptions = {
    bar: {
      horizontal: true,

      borderRadius: 6,

      distributed: true,

      barHeight: '55%',
    },
  };

  barXAxis: ApexXAxis = {
    categories: ['Router', 'Desktop', 'Laptop', 'Mobile', 'Tablet', 'Unknown'],

    labels: {
      style: {
        fontSize: '11px',
      },
    },
  };

  barYAxis: ApexYAxis = {
    labels: {
      style: {
        fontSize: '12px',
      },
    },
  };

  barDataLabels: ApexDataLabels = {
    enabled: true,

    style: {
      fontSize: '11px',
    },
  };

  barLegend: ApexLegend = {
    show: false,
  };

  barColors: string[] = ['#08cdbd', '#4f46e5', '#0ea5e9', '#f59e0b', '#8b5cf6', '#94a3b8'];

  barTooltip: ApexTooltip = {
    enabled: true,
  };

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    // Initial network load
    this.networkService.getDevices().subscribe({
      next: (response) => {
        this.processNetworkDevices(response.data.devices);
      },

      error: (error) => {
        console.error('Failed to load network devices:', error);
      },
    });

    // Background refresh
    this.refreshSubscription = interval(10000)
      .pipe(switchMap(() => this.networkService.getDevices()))
      .subscribe({
        next: (response) => {
          this.processNetworkDevices(response.data.devices);
        },

        error: (error) => {
          console.error('Failed to refresh network devices:', error);
        },
      });
  }

  // =========================================================
  // LOAD NETWORK DEVICES
  // =========================================================

  private loadNetworkDevices(): void {
    this.networkService.getDevices().subscribe({
      next: (response) => {
        console.log('Dashboard network devices:', response);

        this.processNetworkDevices(response.data.devices);
      },

      error: (error) => {
        console.error('Failed to load network devices:', error);
      },
    });
  }

  // =========================================================
  // PROCESS DEVICES
  // =========================================================

  private processNetworkDevices(devices: NetworkDevice[]): void {
    this.currentDevices = devices;
    // -------------------------------------------------------
    // Total
    // -------------------------------------------------------

    this.networkDeviceCount = devices.length;

    // -------------------------------------------------------
    // Computers
    // Desktop + Laptop
    // -------------------------------------------------------

    const desktopCount = this.countDeviceType(devices, 'desktop');

    const laptopCount = this.countDeviceType(devices, 'laptop');

    this.computerCount = desktopCount + laptopCount;

    // -------------------------------------------------------
    // Mobile Devices
    // Mobile + Tablet
    // -------------------------------------------------------

    const mobileCount = this.countDeviceType(devices, 'mobile');

    const tabletCount = this.countDeviceType(devices, 'tablet');

    this.mobileDeviceCount = mobileCount + tabletCount;

    // -------------------------------------------------------
    // Routers
    // -------------------------------------------------------

    this.routerCount = this.countDeviceType(devices, 'router');

    // -------------------------------------------------------
    // Online / Offline
    // -------------------------------------------------------

    this.onlineDeviceCount = devices.filter((device) => device.status === 'online').length;

    this.offlineDeviceCount = devices.filter((device) => device.status === 'offline').length;

    // -------------------------------------------------------
    // Recently discovered devices
    // -------------------------------------------------------

    this.recentDevices = devices.slice(0, 5);

    // -------------------------------------------------------
    // Update charts
    // -------------------------------------------------------

    this.updateCharts();

    this.cdr.detectChanges();
  }

  // =========================================================
  // COUNT DEVICE TYPE
  // =========================================================

  private countDeviceType(devices: NetworkDevice[], type: NetworkDevice['deviceType']): number {
    return devices.filter((device) => device.deviceType === type).length;
  }

  // =========================================================
  // UPDATE CHARTS
  // =========================================================

  private updateCharts(): void {
    const routerCount = this.countDeviceTypeFromCurrentData('router');

    const desktopCount = this.countDeviceTypeFromCurrentData('desktop');

    const laptopCount = this.countDeviceTypeFromCurrentData('laptop');

    const mobileCount = this.countDeviceTypeFromCurrentData('mobile');

    const tabletCount = this.countDeviceTypeFromCurrentData('tablet');

    const unknownCount = this.countDeviceTypeFromCurrentData('unknown');

    const data = [routerCount, desktopCount, laptopCount, mobileCount, tabletCount, unknownCount];

    this.donutSeries = [...data];

    this.barSeries = [
      {
        name: 'Devices',
        data: [...data],
      },
    ];
  }

  /*
   * The chart data is calculated from recentDevices plus
   * the statistics already available.
   *
   * For complete accuracy, we keep the current device list
   * separately.
   */

  private currentDevices: NetworkDevice[] = [];

  private countDeviceTypeFromCurrentData(type: NetworkDevice['deviceType']): number {
    return this.currentDevices.filter((device) => device.deviceType === type).length;
  }

  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }
}
