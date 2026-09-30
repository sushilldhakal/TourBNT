import { redirect } from 'next/navigation';

// Business-partner onboarding now lives with seller onboarding on the unified Applications page.
export default function BusinessPartnersAdminPage() {
    redirect('/dashboard/users/seller-applications');
}
