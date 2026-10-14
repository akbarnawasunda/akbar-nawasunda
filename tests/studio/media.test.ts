import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getMediaStorageStatus, R2_REQUIRED_ENV, UPLOADS_IMPLEMENTED } from "../../src/studio/media/storage";

describe("media storage boundary", () => {
  it("reports storage as not configured with every variable missing", () => {
    const status = getMediaStorageStatus({});
    assert.equal(status.configured, false);
    assert.equal(status.uploadsAvailable, false);
    assert.deepEqual(status.missing, [...R2_REQUIRED_ENV]);
  });

  it("never reports uploads as available while the upload handler is not implemented", () => {
    assert.equal(UPLOADS_IMPLEMENTED, false);
    const env = Object.fromEntries(R2_REQUIRED_ENV.map((name) => [name, "set"]));
    const status = getMediaStorageStatus(env);
    assert.equal(status.configured, true);
    assert.equal(status.uploadsAvailable, false);
  });

  it("treats blank values as missing", () => {
    const env = { ...Object.fromEntries(R2_REQUIRED_ENV.map((name) => [name, "set"])), MEDIA_R2_BUCKET: "  " };
    assert.deepEqual(getMediaStorageStatus(env).missing, ["MEDIA_R2_BUCKET"]);
  });
});
