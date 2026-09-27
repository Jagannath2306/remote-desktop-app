import { HttpContextToken } from '@angular/common/http';

/**
 * Controls whether the global HTTP loader
 * should be displayed for a request.
 *
 * Default = false
 */
export const SHOW_LOADER =
  new HttpContextToken<boolean>(() => false);

