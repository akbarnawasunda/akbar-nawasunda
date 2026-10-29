/**
 * Rasterises the two baked plate layers off the main thread.
 *
 * See `foil-geometry.ts` for why: the plate's 195 clipped strokes cost 50–62 ms of rasterisation
 * the first time anything reads the canvas back, and that bill used to land on the main thread the
 * moment the mount gate opened — the reader's first scroll. An `OffscreenCanvas` here means the
 * bill is paid on this thread instead, and the page receives a finished `ImageBitmap`.
 *
 * The worker is started only when the foil chunk mounts (i.e. after the gate), so it adds nothing
 * to the initial page load and nothing to scroll 0.
 */
/// <reference lib="webworker" />

import { buildPlates, type Palette } from "./foil-geometry";

export interface PlateRequest {
  /** Echoed back so the main thread can drop a stale answer after a resize. */
  id: number;
  width: number;
  height: number;
  dpr: number;
  ambient: boolean;
  palette: Palette;
}

export interface PlateResponse {
  id: number;
  base: ImageBitmap | null;
  rims: ImageBitmap | null;
}

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = (event: MessageEvent<PlateRequest>) => {
  const { id, width, height, dpr, ambient, palette } = event.data;
  const make = (w: number, h: number) => new OffscreenCanvas(w, h);
  const { plates } = buildPlates(make, width, height, dpr, ambient, palette);

  /* `transferToImageBitmap` is what forces the rasterisation here, while the canvas is still ours.
     After it, the canvas is empty — which is fine, it is one-shot by design. */
  const base = plates.base instanceof OffscreenCanvas ? plates.base.transferToImageBitmap() : null;
  const rims = plates.rims instanceof OffscreenCanvas ? plates.rims.transferToImageBitmap() : null;

  const transfer: Transferable[] = [];
  if (base) transfer.push(base);
  if (rims) transfer.push(rims);

  const response: PlateResponse = { id, base, rims };
  scope.postMessage(response, transfer);
};
