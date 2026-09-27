
import {
  Injectable,
  signal
} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {

  private requestCount = 0;

  readonly isLoading =
    signal(false);

  show(): void {

    this.requestCount++;

    this.isLoading.set(true);
  }

  hide(): void {

    this.requestCount--;

    if (this.requestCount <= 0) {

      this.requestCount = 0;

      this.isLoading.set(false);
    }
  }

  reset(): void {

    this.requestCount = 0;

    this.isLoading.set(false);
  }
}
