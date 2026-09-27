import { Component, Input, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-vnc-password-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './vnc-password-modal.html',
  styleUrl: './vnc-password-modal.css',
})
export class VncPasswordModal {
  readonly activeModal = inject(NgbActiveModal);

  @Input()
  pcName = '';

  @Input()
  pcId = '';

  password = '';

  showPassword = false;

  submitting = false;

  submit(): void {
    if (!this.password.trim()) {
      return;
    }

    this.submitting = true;

    this.activeModal.close(this.password);
  }

  cancel(): void {
    this.activeModal.dismiss('cancel');
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
