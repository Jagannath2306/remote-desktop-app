
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import { PcService } from '../../services/pc.service';

import { PcCreate } from '../pc-create/pc-create';

import { RemotePc } from '../../models/remote-pc.model';


@Component({
  selector: 'app-manage-remote-pc',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    PcCreate
  ],

  templateUrl: './manage-remote-pc.html',

  styleUrl: './manage-remote-pc.css',
})
export class ManageRemotePcComponent implements OnInit {

  private readonly pcService =
    inject(PcService);

  private readonly router =
    inject(Router);

  private readonly cdr =
    inject(ChangeDetectorRef);


  // =========================================================
  // DATA
  // =========================================================

  pcs: RemotePc[] = [];

  filteredPcs: RemotePc[] = [];


  // =========================================================
  // SEARCH
  // =========================================================

  searchText = '';


  // =========================================================
  // VIEW
  // =========================================================

  viewMode: 'card' | 'list' = 'card';


  // =========================================================
  // LOADING
  // =========================================================

  loading = false;

  saving = false;

  deleting = false;


  // =========================================================
  // ADD / EDIT MODAL
  // =========================================================

  showPcCreate = false;

  pcCreateMode: 'add' | 'edit' = 'add';

  selectedPc: RemotePc | null = null;


  // =========================================================
  // DELETE MODAL
  // =========================================================

  showDeleteModal = false;

  pcToDelete: RemotePc | null = null;


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    this.loadPcs();
  }


  // =========================================================
  // LOAD PCS
  // =========================================================

  loadPcs(): void {

    this.loading = true;

    this.pcService.getAll().subscribe({

      next: (response) => {

        if (response.success) {

          this.pcs =
            response.data;

          this.applyFilter();
        }

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Failed to load remote PCs:',
          error
        );

        this.loading = false;
      }

    });
  }


  // =========================================================
  // SEARCH
  // =========================================================

  onSearch(): void {
    this.applyFilter();
  }


  applyFilter(): void {

    const search =
      this.searchText
        .trim()
        .toLowerCase();


    if (!search) {

      this.filteredPcs =
        [...this.pcs];

      return;
    }


    this.filteredPcs =
      this.pcs.filter((pc) => {

        return (
          pc.pcId
            .toLowerCase()
            .includes(search) ||

          pc.name
            .toLowerCase()
            .includes(search) ||

          pc.host
            .toLowerCase()
            .includes(search)
        );

      });
  }


  // =========================================================
  // ADD
  // =========================================================

  openAddPc(): void {

    this.pcCreateMode =
      'add';

    this.selectedPc =
      null;

    this.saving =
      false;

    this.showPcCreate =
      true;

    this.cdr.detectChanges();
  }


  // =========================================================
  // EDIT
  // =========================================================

  openEditPc(
    pc: RemotePc
  ): void {

    this.pcCreateMode =
      'edit';

    this.selectedPc =
      pc;

    this.saving =
      false;

    this.showPcCreate =
      true;

    this.cdr.detectChanges();
  }


  // =========================================================
  // CLOSE ADD / EDIT
  // =========================================================

  closePcCreate(): void {

    if (this.saving) {
      return;
    }

    this.showPcCreate =
      false;

    this.selectedPc =
      null;

    this.cdr.detectChanges();
  }


  // =========================================================
  // SAVE
  // =========================================================

  onPcSaved(
    event: {
      mode: 'add' | 'edit';

      data: {
        _id?: string;

        pcId: string;

        name: string;

        host: string;

        vncPort: number;

        isActive: boolean;
      };
    }
  ): void {

    this.saving = true;


    // =======================================================
    // ADD
    // =======================================================

    if (event.mode === 'add') {

      this.pcService
        .create({

          pcId:
            event.data.pcId,

          name:
            event.data.name,

          host:
            event.data.host,

          vncPort:
            event.data.vncPort,

        })
        .subscribe({

          next: (response) => {

            if (!response.success) {

              this.saving =
                false;

              return;
            }


            // API success

            this.saving =
              false;


            // Close popup automatically

            this.closePcCreate();


            // Refresh PC list

            this.loadPcs();
          },


          error: (error) => {

            console.error(
              'Failed to create remote PC:',
              error
            );

            this.saving =
              false;
          }

        });

      return;
    }


    // =======================================================
    // EDIT
    // =======================================================

    if (!event.data._id) {

      console.error(
        'MongoDB _id is missing'
      );

      this.saving =
        false;

      return;
    }


    this.pcService
      .update({

        _id:
          event.data._id,

        name:
          event.data.name,

        host:
          event.data.host,

        vncPort:
          event.data.vncPort,

        isActive:
          event.data.isActive,

      })
      .subscribe({

        next: (response) => {

          if (!response.success) {

            this.saving =
              false;

            return;
          }


          // API success

          this.saving =
            false;


          // Close popup automatically

          this.closePcCreate();


          // Refresh PC list

          this.loadPcs();
        },


        error: (error) => {

          console.error(
            'Failed to update remote PC:',
            error
          );


          // Keep popup open if update fails

          this.saving =
            false;
        }

      });
  }


  // =========================================================
  // DELETE
  // =========================================================

  openDeleteModal(
    pc: RemotePc
  ): void {

    this.pcToDelete =
      pc;

    this.showDeleteModal =
      true;
  }


  closeDeleteModal(): void {

    if (this.deleting) {
      return;
    }

    this.showDeleteModal =
      false;

    this.pcToDelete =
      null;
  }


  confirmDelete(): void {

    if (!this.pcToDelete?._id) {
      return;
    }

    this.deleting =
      true;


    this.pcService
      .delete({

        _id:
          this.pcToDelete._id,

      })
      .subscribe({

        next: (response) => {

          this.deleting =
            false;


          if (!response.success) {
            return;
          }


          this.showDeleteModal =
            false;

          this.pcToDelete =
            null;


          this.loadPcs();
        },


        error: (error) => {

          console.error(
            'Failed to delete remote PC:',
            error
          );

          this.deleting =
            false;
        }

      });
  }


  // =========================================================
  // REFRESH STATUS
  // =========================================================

  refreshStatus(): void {

    this.loading =
      true;


    this.pcService
      .checkStatus()
      .subscribe({

        next: (response) => {

          if (response.success) {

            this.pcs =
              response.data;

            this.applyFilter();
          }

          this.loading =
            false;
        },


        error: (error) => {

          console.error(
            'Failed to refresh PC status:',
            error
          );

          this.loading =
            false;
        }

      });
  }


  // =========================================================
  // CONNECT
  // =========================================================

  connectToPc(
    pc: RemotePc
  ): void {

    if (!pc.isActive) {
      return;
    }

    this.router.navigate([
      '/remote-session',
      pc.pcId
    ]);
  }


  // =========================================================
  // TRACK
  // =========================================================

  trackByPcId(
    _index: number,
    pc: RemotePc
  ): string {

    return pc.pcId;
  }
}
