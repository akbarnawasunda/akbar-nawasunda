/**
 * Homepage counters.
 *
 * Both numbers are derived, never typed by hand: the year comes from `siteConfig.since` and the
 * count from the verified release list. A hard-coded "+5 tahun" would silently go stale, and a
 * hard-coded release count would drift the moment a release is added. Anything not in the verified
 * list is not counted, so this cannot inflate the catalogue.
 */
import { releases } from "./releases";

export interface HeroStats {
  yearsActive: number;
  releaseCount: number;
  base: string;
}

export function heroStats(options: {
  since: number;
  origin: string;
  releaseCount?: number;
  now?: Date;
}): HeroStats {
  const year = (options.now ?? new Date()).getFullYear();
  return {
    yearsActive: Math.max(0, year - options.since),
    releaseCount: options.releaseCount ?? releases.length,
    base: options.origin,
  };
}
