import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/legal/LegalPage';
import { CookieSettingsButton } from '@/components/consent/CookieConsent';
import { mockCompanyInfo as company } from '@/lib/api/companyApi';

export const metadata: Metadata = {
    title: 'Cookie Policy | TourBNT',
    description: 'The cookies and browser storage TourBNT uses, what each is for, and how to control them.',
    alternates: { canonical: '/cookies' },
};

const rows: Array<[name: string, kind: string, purpose: string, lasts: string]> = [
    ['token', 'Cookie (essential)', 'Keeps you signed in. HTTP-only, so page scripts cannot read it.', '2 hours, or 30 days if you choose “keep me signed in”'],
    ['refreshToken', 'Cookie (essential)', 'Renews your sign-in without asking for your password again.', 'Up to 30 days'],
    ['cartBookings', 'Browser storage (essential)', 'Remembers the tours in your cart.', 'Until you clear it or check out'],
    ['theme', 'Browser storage (preference)', 'Remembers light or dark mode.', 'Until you clear it'],
    ['layout-full-width', 'Browser storage (preference)', 'Remembers whether you prefer the full-width layout.', 'Until you clear it'],
    ['tourbnt:consent', 'Browser storage (essential)', 'Remembers the choice you made on the cookie notice.', 'Until you clear it or change your choice'],
    ['tourbnt:location', 'Session storage (only if you use “near me”)', 'Holds your rounded location for this visit so we do not ask again on every page.', 'Until you close the tab'],
    ['__cf_bm and similar', 'Cookie (security, set by Cloudflare)', 'Helps tell real visitors from bots so we can keep the site available.', 'About 30 minutes'],
    ['_ga, _ga_*', 'Cookie (analytics — only if you accept)', 'Google Analytics, if enabled on the site: counts visits and shows which pages are used. IP addresses are anonymised.', 'Up to 2 years'],
];

export default function CookiePolicyPage() {
    return (
        <LegalPage
            title="Cookie Policy"
            updated="3 October 2026"
            intro={<>{company.companyName} uses a few cookies and similar browser storage. Most are essential to make the site work; one optional group, analytics, is used only if you agree.</>}
        >
            <Section title="What we use">
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary text-foreground">
                            <tr>
                                <th className="text-left p-3">Name</th>
                                <th className="text-left p-3">Type</th>
                                <th className="text-left p-3">Purpose</th>
                                <th className="text-left p-3">Lasts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(([name, kind, purpose, lasts]) => (
                                <tr key={name} className="border-t border-border align-top">
                                    <td className="p-3 font-mono text-xs text-foreground">{name}</td>
                                    <td className="p-3">{kind}</td>
                                    <td className="p-3">{purpose}</td>
                                    <td className="p-3">{lasts}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section title="Essential versus optional">
                <p><strong>Essential</strong> cookies and storage are needed for sign-in, your cart, security and remembering your choices. They cannot be switched off here, but you can block them in your browser, which will stop parts of the site working.</p>
                <p><strong>Analytics</strong> cookies are optional. We set them only after you choose “Accept all”, and never before.</p>
                <p>We do not use advertising cookies and do not track you across other websites. Sponsored businesses on the site are chosen from the page you are looking at.</p>
            </Section>

            <Section title="Change your choice">
                <p>You can change your mind at any time: <CookieSettingsButton className="text-primary underline underline-offset-4 hover:opacity-80" />. You can also delete cookies and site data in your browser settings.</p>
            </Section>

            <Section title="Questions">
                <p>Email <a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a>. See also our <a href="/privacy">Privacy Policy</a>.</p>
            </Section>
        </LegalPage>
    );
}
