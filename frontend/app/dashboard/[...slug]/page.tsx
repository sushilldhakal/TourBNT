import { notFound } from 'next/navigation';

/**
 * Catch-all for unmatched /dashboard/* paths.
 * Next.js only uses segment not-found.tsx when notFound() is called;
 * unmatched URLs otherwise hit the root not-found. This route ensures
 * /dashboard/anything-invalid shows the dashboard 404 page.
 */
export default function DashboardCatchAll() {
    notFound();
}
