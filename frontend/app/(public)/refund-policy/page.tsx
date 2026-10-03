import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/legal/LegalPage';
import { mockCompanyInfo as company } from '@/lib/api/companyApi';

export const metadata: Metadata = {
    title: 'Cancellation & Refund Policy | TourBNT',
    description: 'How to cancel or change a booking on TourBNT and when you get a refund.',
    alternates: { canonical: '/refund-policy' },
};

export default function RefundPolicyPage() {
    return (
        <LegalPage
            title="Cancellation & Refund Policy"
            updated="3 October 2026"
            intro={<>Plans change. This page explains how to cancel or change a booking made on {company.companyName} and what you can expect back. It is part of our <a className="text-primary hover:underline" href="/terms">Terms of Service</a>.</>}
        >
            <Section title="1. The tour's own terms come first">
                <p>Each tour is run by an independent Operator, and the cancellation terms shown on the tour page and in your booking confirmation apply to your booking. Where a tour does not state its own terms, the schedule in section 2 applies.</p>
            </Section>

            <Section title="2. Default schedule">
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary text-foreground">
                            <tr><th className="text-left p-3">You cancel</th><th className="text-left p-3">Refund of the amount paid</th></tr>
                        </thead>
                        <tbody>
                            <tr className="border-t border-border"><td className="p-3">30 days or more before departure</td><td className="p-3">100%</td></tr>
                            <tr className="border-t border-border"><td className="p-3">29 to 14 days before departure</td><td className="p-3">50%</td></tr>
                            <tr className="border-t border-border"><td className="p-3">Fewer than 14 days before departure, or no-show</td><td className="p-3">No refund</td></tr>
                        </tbody>
                    </table>
                </div>
                <p>Bank or payment-provider fees charged on the original payment are not refundable. Optional extras the Operator has already paid for on your behalf (for example permits or flights) may be deducted where they cannot be recovered.</p>
            </Section>

            <Section title="3. How to cancel">
                <ul>
                    <li>Sign in, open the booking from <strong>My bookings</strong> and choose cancel. Online cancellation closes 48 hours before departure; after that, contact us or the Operator directly.</li>
                    <li>Booked as a guest? Use the link in your confirmation email, or contact us with your booking reference.</li>
                    <li>You will receive an email confirming the cancellation.</li>
                </ul>
            </Section>

            <Section title="4. If the Operator cancels or changes the trip">
                <p>If an Operator cancels, or makes a significant change you do not want (for example a different date or a major change to the itinerary), you may accept the change, choose another departure, or receive a full refund of what you paid for that tour. Where a departure cannot run because too few people booked or a provider could not confirm, we will tell you as soon as we know.</p>
            </Section>

            <Section title="5. Events outside anyone's control">
                <p>Severe weather, landslides, flight or road closures, natural disasters, strikes and similar events can stop a trip. If an Operator cancels for these reasons, you will be offered a rebooking or a refund of the amounts the Operator did not have to spend on your behalf. Weather-dependent activities (such as mountain flights and paragliding) may be rescheduled to another day when conditions allow.</p>
            </Section>

            <Section title="6. Changing your booking">
                <p>To change a date or the number of travellers, contact us or the Operator as early as you can. Changes depend on availability and may change the price. If a change is not possible, the cancellation schedule above applies.</p>
            </Section>

            <Section title="7. How refunds are paid">
                <p>Approved refunds go back to the original payment method and typically reach you within 10 business days, depending on your bank. If you paid on arrival, there is nothing to refund unless you made another payment.</p>
            </Section>

            <Section title="8. Travel insurance">
                <p>We strongly recommend insurance that covers cancellation as well as medical care and evacuation. Insurance can cover costs this policy does not.</p>
            </Section>

            <Section title="9. Contact">
                <p>Questions or a dispute about a refund? Email <a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a> with your booking reference.</p>
            </Section>
        </LegalPage>
    );
}
