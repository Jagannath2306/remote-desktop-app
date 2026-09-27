import { HttpInterceptorFn } from '@angular/common/http';

import { inject } from '@angular/core';

import { finalize } from 'rxjs';

import { LoaderService } from '../services/loader.service';

/*
 * URLs for which the global loader
 * should NOT be displayed.
 *
 * Add more URLs here when required.
 */
const SKIP_LOADER_URLS: string[] = ['/api/network/devices', '/api/remote-pcs/status'];

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderService);

  /*
   * Check whether the current request URL
   * belongs to the URLs that should skip
   * the global loader.
   */
  const shouldSkipLoader = SKIP_LOADER_URLS.some((url) => req.url.includes(url));

  /*
   * Background / polling request
   *
   * Continue the request normally without
   * showing the global loader.
   */
  if (shouldSkipLoader) {
    return next(req);
  }

  /*
   * All other HTTP requests will show
   * the global loader.
   */
  loaderService.show();

  /*
   * Hide loader when the request:
   *
   * - succeeds
   * - fails
   * - is cancelled
   */
  return next(req).pipe(
    finalize(() => {
      loaderService.hide();
    }),
  );
};
