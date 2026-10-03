import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpFaq } from '@/components/help/HelpFaq';
import { FAQ_GROUPS } from '@/lib/help/faqs';

export const metadata: Metadata = {
    title: 'Help Center | TourBNT',
    description: 'Answers about booking tours, payments, cancellations and refunds, travel preparation and your TourBNT account.',
    alternates: { canonical: '/help' },
};

export default function HelpPage() {
    // FAQPage structured data lets search engines show these answers directly in results.
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_GROUPS.flatMap((g) => g.items).map((i) => ({
            '@type': 'Question',
            name: i.q,
            acceptedAnswer: { '@type': 'Answer', text: i.a },
        })),
    };

    return (
        <div className="w-full mx-auto px-4 py-12 md:py-16">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Help Center</h1>
                <p className="text-lg text-muted-foreground mb-6">Quick answers to the things travellers and tour operators ask us most.</p>
                <nav aria-label="Help topics" className="flex flex-wrap gap-2 mb-10">
                    {FAQ_GROUPS.map((g) => (
                        <a key={g.id} href={`#${g.id}`} className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                            {g.title}
                        </a>
                    ))}
                </nav>

                <HelpFaq />

                <div className="mt-12 rounded-lg border border-border bg-card p-6 text-center">
                    <h2 className="text-xl font-semibold mb-2">Still need help?</h2>
                    <p className="text-muted-foreground mb-4">Send us a message and we will get back to you. Include your booking reference if you have one.</p>
                    <Link href="/contact" className="inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Contact us</Link>
                </div>
                <p className="mt-8 text-sm text-muted-foreground">
                    See also: <Link className="text-primary hover:underline" href="/terms">Terms</Link> · <Link className="text-primary hover:underline" href="/privacy">Privacy</Link> · <Link className="text-primary hover:underline" href="/cookies">Cookies</Link> · <Link className="text-primary hover:underline" href="/refund-policy">Cancellation &amp; Refund Policy</Link>
                </p>
            </div>
        </div>
    );
}
