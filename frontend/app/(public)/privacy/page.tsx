import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/legal/LegalPage';
import { mockCompanyInfo as company } from '@/lib/api/companyApi';

export const metadata: Metadata = {
    title: 'Privacy Policy | TourBNT',
    description: 'What personal data TourBNT collects, why, who we share it with, and the choices you have.',
    alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
    return (
        <LegalPage
            title="Privacy Policy"
            updated="3 October 2026"
            intro={<>{company.companyName} respects your privacy. This policy explains what personal data we collect when you use the site, why we collect it, who we share it with and what rights you have.</>}
        >
            <Section title="1. Who is responsible for your data">
                <p>{company.companyName} (“we”) is the controller of the personal data described here. Contact: <a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a>, {company.address}.</p>
            </Section>

            <Section title="2. What we collect">
                <ul>
                    <li><strong>Account data:</strong> name, email address, phone number, password (stored only as a one-way hash), profile picture and role.</li>
                    <li><strong>Booking data:</strong> the tour, date and number of travellers; the contact details you give; names and nationality of travellers; special requests; price and payment status. If you book as a guest we keep the contact details you enter.</li>
                    <li><strong>Messages and enquiries:</strong> what you send us, an Operator or a Provider through the contact form, enquiry form or inbox.</li>
                    <li><strong>Reviews and posts:</strong> ratings, comments and anything else you publish.</li>
                    <li><strong>Operators, Providers and advertisers:</strong> business details, documents you upload for approval, and payout bank details.</li>
                    <li><strong>Technical data:</strong> IP address, browser and device type, pages visited, and error logs, collected automatically for security, performance and to keep the site working.</li>
                    <li><strong>Approximate location, only if you allow it:</strong> if you choose “Show businesses near me”, your browser shares your location with the page. It is rounded to about 1 km, kept only for your browser session, and used once to find nearby destinations. We do not store it on our servers or in logs.</li>
                </ul>
            </Section>

            <Section title="3. Why we use it, and on what basis">
                <ul>
                    <li><strong>To provide the service</strong> — create your account, take and manage bookings, send confirmations and receipts, enable messages with Operators (contract).</li>
                    <li><strong>To keep the platform safe</strong> — prevent fraud, abuse and spam, apply rate limits, investigate problems (legitimate interests).</li>
                    <li><strong>To improve the site</strong> — understand how it is used and fix errors (legitimate interests, or your consent for analytics cookies where required).</li>
                    <li><strong>To show relevant local ads</strong> — sponsored businesses are chosen from the tour, destination or search you are looking at, not from a profile of you (legitimate interests).</li>
                    <li><strong>To meet legal obligations</strong> — accounting, tax and responding to lawful requests.</li>
                    <li><strong>To send you news</strong> — only if you subscribe to the newsletter (consent), and you can unsubscribe in every email.</li>
                </ul>
            </Section>

            <Section title="4. Who we share it with">
                <ul>
                    <li><strong>The Operator and Providers of your trip</strong>, who need your booking details and contact information to deliver it. They are responsible for their own use of that data.</li>
                    <li><strong>Service providers that run the platform for us:</strong> cloud hosting; our database host (Neon); content delivery, security and file storage (Cloudflare); email delivery (Maileroo); and, where enabled, error monitoring, analytics, bot protection and payment processing. They may only use data to provide their service to us.</li>
                    <li><strong>Authorities</strong> where the law requires it, or to protect rights, safety and property.</li>
                    <li>We do not sell your personal data.</li>
                </ul>
            </Section>

            <Section title="5. Where your data is processed">
                <p>Our servers and database are located in Asia-Pacific, and some providers process data in other countries. Where data leaves your country, we rely on safeguards such as contractual protections appropriate to the transfer.</p>
            </Section>

            <Section title="6. How long we keep it">
                <p>We keep account data while your account is open. Booking, payment and invoice records are kept for as long as accounting and tax law requires, which is commonly several years. Messages and reviews are kept for as long as they are needed for the booking or the public review. Technical logs are kept for a short period. You can ask us to delete your account at any time; we will delete or anonymise what we are not required to keep.</p>
            </Section>

            <Section title="7. How we protect it">
                <p>Passwords are hashed, sign-in uses secure HTTP-only cookies, connections are encrypted, access to systems is limited, and we monitor for abuse. No online service is perfectly secure; tell us at once if you suspect a problem.</p>
            </Section>

            <Section title="8. Your rights">
                <p>Depending on where you live, you can ask us to: give you a copy of your data; correct it; delete it; restrict or object to some processing; move it to another service; and withdraw consent you gave (for example for newsletters or analytics cookies). To use these rights email <a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a>. You may also complain to your local data-protection authority.</p>
            </Section>

            <Section title="9. Cookies and similar technologies">
                <p>We use a small number of cookies and browser storage. See our <a href="/cookies">Cookie Policy</a> for details and how to change your choices.</p>
            </Section>

            <Section title="10. Children">
                <p>The site is not for people under 18, and we do not knowingly collect their data. Parents or guardians may book on behalf of children and provide their details for the trip.</p>
            </Section>

            <Section title="11. Changes to this policy">
                <p>We may update this policy and will change the date above when we do. For important changes we will notify you on the site or by email.</p>
            </Section>
        </LegalPage>
    );
}
