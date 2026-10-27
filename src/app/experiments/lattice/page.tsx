import type { Metadata } from "next";

import { LatticeExperiment } from "@/experiments/lattice/LatticeExperiment";

export const metadata: Metadata = {
  title: "Study 01 — Lattice",
  description: "A visual study exploring spatial depth and rhythm. Not a production page.",
  // Prototype route: keep it out of search indexes until it is an intentional part of the site.
  robots: { index: false, follow: false },
};

export default function LatticePage() {
  return <LatticeExperiment />;
}
