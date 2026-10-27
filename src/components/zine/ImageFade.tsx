"use client";

import { useEffect } from "react";

/**
 * Image fade-in, once per image.
 *
 * Every picture on the page — sleeve, portrait, archive frame — is marked `data-img="pending"` until
 * the browser has the bytes, then `loaded`, which swaps one opacity transition in `globals.css`. Two
 * details matter:
 *
 * - a cached image is *already* `complete` when this runs, so it is marked loaded on the first tick
 *   instead of waiting for a `load` that has already fired (the classic way a fade leaves a page
 *   permanently blank);
 * - an image that fails is marked loaded too. A broken file must show the browser's broken state or
 *   the component's own fallback, not an invisible box.
 *
 * New images (a client route, a lightbox, a studio preview) are picked up by a MutationObserver on
 * `<body>` — a DOM subscription, not an animation loop.
 */
export function ImageFade() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const mark = (img: HTMLImageElement) => {
      if (img.complete) {
        img.dataset.img = "loaded";
        return;
      }
      img.dataset.img = "pending";
      const done = () => {
        img.dataset.img = "loaded";
      };
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    };

    const scan = () => {
      for (const node of document.querySelectorAll("img:not([data-img])")) {
        if (node instanceof HTMLImageElement) mark(node);
      }
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
