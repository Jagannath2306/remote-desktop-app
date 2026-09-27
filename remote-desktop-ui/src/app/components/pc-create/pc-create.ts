import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router } from '@angular/router';

import { PcService } from '../../services/pc.service';
import { RemotePc } from '../../models/remote-pc.model';


@Component({
  selector: 'app-pc-create',
  standalone: true,

  imports: [CommonModule, ReactiveFormsModule],

  templateUrl: './pc-create.html',
  styleUrl: './pc-create.css',
})
export class PcCreate implements OnChanges {
  private readonly fb = inject(FormBuilder);

  private readonly pcService = inject(PcService);

  private readonly router = inject(Router);

  // =========================================================
  // INPUTS
  // =========================================================

  @Input()
  mode: 'add' | 'edit' = 'add';

  @Input()
  pc: RemotePc | null = null;

  @Input()
  isModal = false;

  @Input()
  saving = false;

  // =========================================================
  // OUTPUTS
  // =========================================================

  @Output()
  closed = new EventEmitter<void>();

  @Output()
  saved = new EventEmitter<{
    mode: 'add' | 'edit';

    data: {
      _id?: string;
      pcId: string;
      name: string;
      host: string;
      vncPort: number;
      isActive: boolean;
    };
  }>();

  // =========================================================
  // FORM
  // =========================================================

  pcForm = this.fb.nonNullable.group({
    pcId: ['', [Validators.required, Validators.maxLength(50)]],

    name: ['', [Validators.required, Validators.maxLength(100)]],

    host: ['', Validators.required],

    vncPort: [5900, [Validators.required, Validators.min(1), Validators.max(65535)]],

    isActive: [true],
  });

  // =========================================================
  // EDIT MODE
  // =========================================================

  get isEdit(): boolean {
    return this.mode === 'edit';
  }

  // =========================================================
  // INPUT CHANGE
  // =========================================================

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode'] || changes['pc']) {
      this.loadForm();
    }
  }

  // =========================================================
  // LOAD FORM
  // =========================================================

  private loadForm(): void {
    if (this.mode === 'edit' && this.pc) {
      this.pcForm.patchValue({
        pcId: this.pc.pcId,

        name: this.pc.name,

        host: this.pc.host,

        vncPort: this.pc.vncPort,

        isActive: this.pc.isActive,
      });

      return;
    }

    this.pcForm.reset({
      pcId: '',

      name: '',

      host: '',

      vncPort: 5900,

      isActive: true,
    });
  }

  // =========================================================
  // SAVE
  // =========================================================

  save(): void {
    if (this.pcForm.invalid) {
      this.pcForm.markAllAsTouched();

      return;
    }

    const formValue = this.pcForm.getRawValue();

    this.saved.emit({
      mode: this.mode,

      data: {
        _id: this.pc?._id,

        pcId: formValue.pcId.trim(),

        name: formValue.name.trim(),

        host: formValue.host.trim(),

        vncPort: Number(formValue.vncPort),

        isActive: formValue.isActive,
      },
    });
  }

  // =========================================================
  // CANCEL / CLOSE
  // =========================================================

  cancel(): void {
    if (this.isModal) {
      this.closed.emit();

      return;
    }

    this.router.navigate(['/remote-pcs']);
  }
}
