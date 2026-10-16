/** Pre-DB bootstrap cannot use the durable login budget. Bound hashing per worker.
 * This is not a distributed/WAF limit: protect unconfigured deployments at the host too.
 */
export function createSetupHashBudget() {
  let availableAt = 0;
  let active = false;
  return {
    acquire(now: number): boolean {
      if (active || now < availableAt) return false;
      active = true;
      availableAt = now + 12_000;
      return true;
    },
    release(): void { active = false; },
  };
}
export const setupHashBudget = createSetupHashBudget();
