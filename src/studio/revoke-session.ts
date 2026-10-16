/** Do not claim logout or discard the retry credential before durable revocation.
 * A DB outage cannot revoke a bearer token globally without another durable authority.
 */
export async function revokeThenClear(revoke: () => Promise<void>, clear: () => void): Promise<boolean> {
  try {
    await revoke();
  } catch {
    return false;
  }
  clear();
  return true;
}
