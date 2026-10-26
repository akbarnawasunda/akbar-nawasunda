/**
 * Round 32: the phone's own haptic motor, one soft tick on the primary buttons.
 *
 * `navigator.vibrate` exists on Android Chrome and nowhere else; the guard is the feature check
 * itself, so iOS and desktop simply do nothing. Ten milliseconds is a whisper — enough to feel
 * like a switch detent, short enough that nobody could call it a buzz.
 */
export function buzz(ms = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(ms);
  }
}
