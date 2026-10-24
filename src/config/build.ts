/**
 * Which build am I looking at?
 *
 * Three rounds in a row ended with "kok ga ada perubahan?" while the running server already had the
 * new page — the owner was looking at a stale preview, a cached tab, or a port that had died during a
 * rebuild. That is a process failure, not a design one, and it is cheap to remove: every build now
 * carries its commit and the round it belongs to, printed in the footer where the owner can see it
 * without opening devtools.
 *
 * `NEXT_PUBLIC_BUILD_REV` is set by the build script from `git rev-parse --short HEAD`, so it works
 * locally, on CI and on Vercel. It is deliberately public: a commit hash is not a secret, and making
 * the number visible is the entire point.
 */
export const buildRev = process.env.NEXT_PUBLIC_BUILD_REV || "dev";

/** The design round this build implements. Bump it when the concept changes, not every commit. */
export const designRound = "R7 · frekuensi";

export const buildLabel = `${designRound} · ${buildRev}`;
