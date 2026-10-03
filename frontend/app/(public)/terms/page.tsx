import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/legal/LegalPage';
import { mockCompanyInfo as company } from '@/lib/api/companyApi';

export const metadata: Metadata = {
    title: 'Terms of Service | TourBNT',
    description: 'The terms that apply when you browse, book tours or list your business on TourBNT.',
    alternates: { canonical: '/terms' },
};

export default function TermsPage() {
    return (
        <LegalPage
            title="Terms of Service"
            updated="3 October 2026"
            intro={<>These terms apply when you use {company.companyName}: browsing tours, creating an account, making a booking, or listing your business with us. Please read them; by using the site you agree to them.</>}
        >
            <Section title="1. Who we are and what we do">
                <p>{company.companyName} is an online marketplace. It connects travellers with independent tour operators and with the hotels, guesthouses, restaurants, guides and transport providers that deliver a trip (together, “Operators” and “Providers”).</p>
                <p>Unless a tour page says otherwise, the tour itself is run by the Operator named on it, not by {company.companyName}. When you book, your contract for the trip is with that Operator; {company.companyName} provides the platform, takes the booking and passes it on.</p>
            </Section>

            <Section title="2. Your account">
                <ul>
                    <li>You must be at least 18 to create an account or make a booking. If you book for others, you confirm you are allowed to do so on their behalf.</li>
                    <li>Give accurate information and keep it up to date. We may ask you to verify your email address.</li>
                    <li>You are responsible for your password and for everything done through your account. Tell us promptly if you think it has been misused.</li>
                    <li>We may suspend or close accounts that break these terms, are used for fraud, or put others at risk.</li>
                </ul>
            </Section>

            <Section title="3. Bookings">
                <p>A booking is complete only when you receive a booking confirmation. Availability depends on the Operator and, for some departures, on confirmation from the hotels, guides, restaurants and transport providers involved. A date can therefore be shown as not yet bookable, and a booking can be declined or changed by the Operator, for example if a service becomes unavailable. If that happens we will tell you and you may choose an alternative or a refund of what you have paid for it.</p>
                <p>Please check names, dates, number of travellers and contact details before you book. Tell us about any errors as soon as you notice them.</p>
            </Section>

            <Section title="4. Prices and payment">
                <ul>
                    <li>Prices are shown in US dollars unless stated otherwise. Currency conversions shown on the site are for information only.</li>
                    <li>Each tour states what is included and excluded. Costs listed as excluded (for example flights, visas, insurance, personal expenses and tips) are your responsibility.</li>
                    <li>Each tour offers one or more payment options: full payment, a deposit with the balance paid later, or payment on arrival. The options available are shown before you book.</li>
                    <li>Discounts and promo codes apply only on the dates and conditions shown, and cannot be exchanged for cash.</li>
                </ul>
            </Section>

            <Section title="5. Changes and cancellations">
                <p>Cancellations, changes and refunds are covered by our <a href="/refund-policy">Cancellation &amp; Refund Policy</a>, which forms part of these terms.</p>
            </Section>

            <Section title="6. Your responsibilities as a traveller">
                <ul>
                    <li>Hold valid travel documents, visas and any permits needed for your trip, unless the tour says it arranges them.</li>
                    <li>Take out travel insurance. For treks and activities at altitude or involving adventure sports, your insurance must cover them, including emergency evacuation. This is a condition of travelling on those tours.</li>
                    <li>Make sure you are fit enough for the trip as described, and tell the Operator in advance about any medical condition, allergy or dietary need that could affect you or the group.</li>
                    <li>Follow your guide's instructions and local laws, and treat people, wildlife, places of worship and the environment with respect.</li>
                </ul>
            </Section>

            <Section title="7. Risks of adventure travel">
                <p>Travel, especially trekking, wildlife viewing, rafting, flying and activities in remote or high-altitude areas, involves real risks including weather, altitude sickness, accidents and delays. Itineraries can change for safety reasons. By booking you accept these risks and understand that the Operator may alter or cancel an activity if conditions make it unsafe.</p>
            </Section>

            <Section title="8. Reviews and content you post">
                <p>Reviews must describe your genuine experience. Do not post anything unlawful, misleading, abusive or that infringes someone else's rights. You keep ownership of what you post, but you give {company.companyName} a non-exclusive, worldwide licence to display, reproduce and promote it on the site and in our marketing. We may moderate, reject or remove content.</p>
            </Section>

            <Section title="9. Operators, Providers and advertisers">
                <ul>
                    <li>Operators, Providers and advertisers must apply and be approved by us. Approval can be withdrawn.</li>
                    <li>Listings, prices, photographs, availability and descriptions must be accurate and kept up to date. You are responsible for delivering what you list, holding the licences and insurance your business needs, and complying with the law.</li>
                    <li>Advertisements are reviewed before they run and are always labelled as sponsored. A paid campaign runs only once it is approved and paid for, and ends at its stated date or when its purchased views are used up.</li>
                    <li>We may remove listings or advertisements, or suspend an account, that are misleading, unsafe or in breach of these terms.</li>
                </ul>
            </Section>

            <Section title="10. Using the site">
                <p>You agree not to misuse the site: no scraping or automated access beyond what we permit, no attempts to break or overload it, no use of someone else's account, and no use to send spam or to harm others. We may apply rate limits and block abusive traffic.</p>
            </Section>

            <Section title="11. Intellectual property">
                <p>The site, its design, software and the content we create belong to {company.companyName} or its licensors. Content supplied by Operators and Providers belongs to them. You may use the site for your personal, non-commercial use, but may not copy or reuse it beyond that without permission.</p>
            </Section>

            <Section title="12. Our responsibility to you">
                <p>We take reasonable care in running the platform, but we do not operate the tours listed by Operators and cannot guarantee their quality, safety or availability. To the extent the law allows, we are not liable for the acts or omissions of Operators and Providers, or for indirect or consequential losses. Nothing in these terms limits liability that cannot be limited by law, including for death or personal injury caused by negligence, or for fraud, and your rights as a consumer are not affected.</p>
            </Section>

            <Section title="13. Events outside our control">
                <p>Neither we nor an Operator are responsible for failing to perform because of events beyond reasonable control, such as natural disasters, severe weather, landslides, strikes, epidemics, government action or airport and road closures. Where a trip cannot go ahead, the Cancellation &amp; Refund Policy explains what you are owed.</p>
            </Section>

            <Section title="14. Changes to these terms">
                <p>We may update these terms. The version that applies to a booking is the one in force when you made it. If we make an important change we will say so on the site or by email.</p>
            </Section>

            <Section title="15. Governing law and disputes">
                <p>These terms are governed by the laws of the jurisdiction in which {company.companyName} is established, as stated in the contact details below, and the courts of that jurisdiction have non-exclusive jurisdiction. If you are a consumer, you also keep the protection of any mandatory consumer laws of the country where you live. Please contact us first at the address below; most problems can be solved quickly.</p>
            </Section>

            <Section title="16. Contact">
                <p>{company.companyName}<br />{company.address}<br /><a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a></p>
            </Section>
        </LegalPage>
    );
}
