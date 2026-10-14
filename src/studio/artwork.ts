import "server-only";

import type { StaticImageData } from "next/image";

import { assets, type AssetEntry } from "@/assets/manifest";

export interface ReleaseArtworkOption {
  id: string;
  label: string;
  alt: string;
}

/**
 * Repository artwork that may be used on a release: approved, role "release-artwork", and an
 * image. Nothing is selected by default, because no asset carries that role yet. Uploaded media is
 * not part of this list.
 */
export function releaseArtworkOptions(): ReleaseArtworkOption[] {
  const entries: readonly AssetEntry[] = assets;
  return entries
    .filter((asset) => asset.status === "approved" && asset.roles.includes("release-artwork") && asset.image !== undefined)
    .map((asset) => ({
      id: asset.id,
      label: asset.id,
      alt: asset.alt ?? "",
    }));
}

export function releaseArtworkIds(): string[] {
  return releaseArtworkOptions().map((option) => option.id);
}

/**
 * Resolves an artwork id for display. Returns null unless the asset is still approved for release
 * artwork in the manifest, so a status change in the manifest takes effect immediately.
 */
export function getReleaseArtwork(id: string | null): { image: StaticImageData; alt: string } | null {
  if (!id) return null;
  const entries: readonly AssetEntry[] = assets;
  const entry = entries.find(
    (asset) => asset.id === id && asset.status === "approved" && asset.roles.includes("release-artwork") && asset.image,
  );
  if (!entry || !entry.image) return null;
  return { image: entry.image, alt: entry.alt ?? "" };
}
