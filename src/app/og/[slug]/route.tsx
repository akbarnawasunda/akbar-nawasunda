import { GET as renderCard } from "../route";
import { releases } from "@/content/releases";
import { getPublishedReleases } from "@/studio/public";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const published = await getPublishedReleases();
  return [...new Set([...releases.map(({ slug }) => slug), ...published.map(({ slug }) => slug)])].map(
    (slug) => ({ slug }),
  );
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const target = new URL(request.url);
  target.pathname = "/og";
  target.search = new URLSearchParams({ slug }).toString();
  return renderCard(new Request(target, request));
}
