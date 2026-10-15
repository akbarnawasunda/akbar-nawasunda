import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hashPassword, verifyPassword } from "../../src/studio/password";

describe("password hashing", () => {
  it("verifies the correct password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery");
    assert.equal(await verifyPassword("correct horse battery", hash), true);
    assert.equal(await verifyPassword("correct horse batterY", hash), false);
    assert.equal(await verifyPassword("", hash), false);
  });

  it("accepts a stored hash with surrounding whitespace from copy-paste, without trimming the password", async () => {
    const hash = await hashPassword("  spaced password  ");
    assert.equal(await verifyPassword("  spaced password  ", `  ${hash}\n`), true);
    assert.equal(await verifyPassword("  spaced password  ", `\n${hash}`), true);
    assert.equal(await verifyPassword("spaced password", ` ${hash}`), false);
  });

  it("salts each hash, so the same password gives different stored values", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    assert.notEqual(a, b);
    assert.equal(await verifyPassword("same-password", a), true);
    assert.equal(await verifyPassword("same-password", b), true);
  });

  it("rejects malformed stored hashes without throwing", async () => {
    assert.equal(await verifyPassword("x", "plaintext"), false);
    assert.equal(await verifyPassword("x", "scrypt$16384$8$1$aa$bb"), false);
    assert.equal(await verifyPassword("x", "md5:1:2:3:aa:bb"), false);
    assert.equal(await verifyPassword("x", "scrypt:0:8:1:aa:bb"), false);
    assert.equal(await verifyPassword("x", "scrypt:16384:8:1::"), false);
  });

  it("refuses empty or extremely long passwords", async () => {
    await assert.rejects(() => hashPassword(""));
    assert.equal(await verifyPassword("a".repeat(5000), await hashPassword("short")), false);
  });
});
