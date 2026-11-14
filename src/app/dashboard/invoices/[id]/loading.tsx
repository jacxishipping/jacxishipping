import { DetailPageSkeleton } from '@/components/design-system';

/**
 * Route-level loading boundary for an invoice detail page (Round 3 part 2).
 *
 * The detail page is a client component that fetches its data after mount,
 * so the RSC + chunk load is the whole wait. Without a boundary of its own
 * the navigation inherits the generic dashboard skeleton; this one matches
 * the detail page's own loading state (DetailPageSkeleton) so a slow
 * navigation commits the URL and shows detail-shaped placeholders at once
 * instead of leaving the list on screen looking dead.
 */
export default function InvoiceDetailLoading() {
  return <DetailPageSkeleton />;
}
