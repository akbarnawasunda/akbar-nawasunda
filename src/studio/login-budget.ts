import type { Client } from "@libsql/client";
import { LOGIN_FAILURE_WINDOW_MS, MAX_LOGIN_FAILURES } from "./security";

/** Reserve BEFORE password verification, atomically across processes/connections.
 * Counts attempts (including successful ones), not asynchronous failure results.
 * Never reset on success: an in-flight request must not erase another reservation.
 */
export async function reserveLoginAttempt(db: Client, now: number): Promise<boolean> {
  const cutoff = now - LOGIN_FAILURE_WINDOW_MS;
  const result = await db.execute({
    sql: `INSERT INTO studio_login_failures (id, failures, window_start) VALUES (1, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        failures = CASE WHEN window_start <= ? THEN 1 ELSE failures + 1 END,
        window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END
      WHERE window_start <= ? OR failures < ?
      RETURNING failures`,
    args: [now, cutoff, cutoff, cutoff, MAX_LOGIN_FAILURES],
  });
  return result.rows.length === 1;
}
