/** Bootstrap has no durable identity yet: never expose it on a production server.
 * Only an explicit development runtime may generate a hash without authentication.
 * Actual initialization remains an operator-controlled environment change.
 */
export function allowsBootstrapHash(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV === "development" && !env.STUDIO_ADMIN_PASSWORD_HASH?.trim();
}
