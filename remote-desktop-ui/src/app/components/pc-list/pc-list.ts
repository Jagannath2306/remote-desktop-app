import { Component, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import { interval, Subscription } from 'rxjs';

import { PcService } from '../../services/pc.service';

import { RemotePc } from '../../models/remote-pc.model';

@Component({
  selector: 'app-pc-list',

  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './pc-list.html',

  styleUrl: './pc-list.css',
})
export class PcList implements OnInit, OnDestroy {
  /*
   * ==========================================
   * SERVICES
   * ==========================================
   */

  private readonly pcService = inject(PcService);

  private readonly router = inject(Router);

  private readonly cdr = inject(ChangeDetectorRef);

  /*
   * ==========================================
   * DATA
   * ==========================================
   */

  // All PCs from database
  pcs: RemotePc[] = [];

  // PCs currently displayed
  filteredPcs: RemotePc[] = [];

  /*
   * ==========================================
   * UI STATE
   * ==========================================
   */

  loading = false;

  searchText = '';

  /*
   * Initial filter
   */

  filter: 'all' | 'online' | 'offline' = 'all';

  /*
   * ==========================================
   * STATUS POLLING
   * ==========================================
   */

  private statusSubscription: Subscription | null = null;

  /*
   * ==========================================
   * INIT
   * ==========================================
   */

  ngOnInit(): void {
    /*
     * Load and check status immediately.
     */

    this.loadPcs();

    /*
     * Check PC status every 5 seconds.
     *
     * First request happens immediately
     * through loadPcs().
     */

    this.statusSubscription = interval(5000).subscribe(() => {
      this.checkPcStatus();
    });
  }

  /*
   * ==========================================
   * LOAD PCs
   * ==========================================
   *
   * Initial load.
   *
   * We use the status API here instead of
   * getAll() so the first page load already
   * contains the real PC status.
   */

  loadPcs(): void {
    this.loading = true;

    this.pcService.checkStatus().subscribe({
      next: (response) => {
        console.log('PC status API response:', response);

        /*
         * Store all PCs.
         */

        this.pcs = response.data || [];

        console.log('All PCs:', this.pcs);

        /*
         * Apply current filter and search.
         */

        this.applyCurrentFilter();

        this.loading = false;

        /*
         * Force UI update.
         */

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Failed to load remote PCs:', error);

        this.pcs = [];

        this.filteredPcs = [];

        this.loading = false;

        this.cdr.detectChanges();
      },
    });
  }

  /*
   * ==========================================
   * CHECK PC STATUS
   * ==========================================
   *
   * Called every 5 seconds.
   */

  checkPcStatus(): void {
    this.pcService.checkStatus().subscribe({
      next: (response) => {
        console.log('PC status updated:', response.data);

        /*
         * Update PC list with latest
         * online/offline status.
         */

        this.pcs = response.data || [];

        /*
         * Re-apply filter and search.
         */

        this.applyCurrentFilter();

        /*
         * Update Angular UI immediately.
         */

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Failed to update PC status:', error);
      },
    });
  }

  /*
   * ==========================================
   * APPLY FILTER
   * ==========================================
   */

  applyFilter(selectedFilter: 'all' | 'online' | 'offline'): void {
    this.filter = selectedFilter;

    this.applyCurrentFilter();
  }

  /*
   * ==========================================
   * APPLY CURRENT FILTER
   * ==========================================
   *
   * This method applies both:
   *
   * 1. Online / Offline filter
   * 2. Search
   *
   */

  private applyCurrentFilter(): void {
    let result = [...this.pcs];

    /*
     * ========================================
     * STATUS FILTER
     * ========================================
     */

    if (this.filter === 'online') {
      result = result.filter((pc) => pc.status === 'online');
    }

    if (this.filter === 'offline') {
      result = result.filter((pc) => pc.status === 'offline');
    }

    /*
     * ========================================
     * SEARCH
     * ========================================
     */

    const search = this.searchText.trim().toLowerCase();

    if (search) {
      result = result.filter(
        (pc) =>
          pc.name.toLowerCase().includes(search) ||
          pc.pcId.toLowerCase().includes(search) ||
          pc.host.toLowerCase().includes(search),
      );
    }

    /*
     * ========================================
     * FINAL RESULT
     * ========================================
     */

    this.filteredPcs = result;
  }

  /*
   * ==========================================
   * SEARCH
   * ==========================================
   */

  applySearch(): void {
    this.applyCurrentFilter();
  }

  /*
   * ==========================================
   * ONLINE COUNT
   * ==========================================
   */

  getOnlineCount(): number {
    return this.pcs.filter((pc) => pc.status === 'online').length;
  }

  /*
   * ==========================================
   * OFFLINE COUNT
   * ==========================================
   */

  getOfflineCount(): number {
    return this.pcs.filter((pc) => pc.status === 'offline').length;
  }

  /*
   * ==========================================
   * ADD PC
   * ==========================================
   */

  addPc(): void {
    this.router.navigate(['/remote-pcs/add']);
  }

  /*
   * ==========================================
   * CONNECT
   * ==========================================
   */

  connect(pc: RemotePc): void {
    console.log('Connecting to:', pc.pcId);

    /*
     * Don't allow connection to an
     * offline PC.
     */

    if (pc.status !== 'online') {
      console.warn(`PC ${pc.pcId} is offline`);

      return;
    }

    /*
     * Navigate to remote session.
     */

    this.router.navigate(['/remote-session', pc.pcId]);
  }

  /*
   * ==========================================
   * DESTROY
   * ==========================================
   */

  ngOnDestroy(): void {
    /*
     * Stop the 5-second polling when
     * leaving the PC list page.
     */

    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();

      this.statusSubscription = null;
    }
  }
}
