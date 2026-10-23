import { NotFoundView } from "@/components/content/NotFoundView";

export { notFoundMetadata as metadata } from "@/lib/not-found";

/** notFound() raised inside a site route (e.g. an unknown release slug). Site chrome is present. */
export default function NotFound() {
  return <NotFoundView />;
}
