import { Component, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-loader',

  standalone: true,

  imports: [CommonModule],

  templateUrl: './loader.html',

  styleUrl: './loader.css',
})
export class Loader {
  readonly loaderService = inject(LoaderService);
}
