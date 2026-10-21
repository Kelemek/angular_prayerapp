import type { Router } from "@angular/router";
import { safeInternalReturnUrl } from "../../lib/safe-internal-return-url";

/** Post-login routes may include query strings (e.g. `/?filter=groups&groupId=…`). */
export function navigateLoginDestination(
  router: Router,
  destination: string,
): Promise<boolean> {
  return router.navigateByUrl(safeInternalReturnUrl(destination));
}
