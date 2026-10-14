/**
 * Prints a scrypt hash for STUDIO_ADMIN_PASSWORD_HASH.
 *
 * The password is read from stdin so it never appears in shell history or process arguments:
 *   read -rs PW && printf '%s' "$PW" | npm run -s studio:hash-password && unset PW
 *
 * Only the hash is written to stdout. The password is never logged.
 */
import { hashPassword } from "../src/studio/password";

async function main(): Promise<void> {
  if (process.stdin.isTTY) {
    console.error("Pipe the password on stdin. See the comment at the top of scripts/studio-hash-password.ts.");
    process.exit(1);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const password = Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");

  if (password.length < 12) {
    console.error("Use a password of at least 12 characters.");
    process.exit(1);
  }

  process.stdout.write(`${await hashPassword(password)}\n`);
}

main().catch(() => {
  console.error("Could not hash the password.");
  process.exit(1);
});
