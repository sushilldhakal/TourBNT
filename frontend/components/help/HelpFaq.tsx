'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FAQ_GROUPS } from '@/lib/help/faqs';

export function HelpFaq() {
    return (
        <div className="space-y-10">
            {FAQ_GROUPS.map((group) => (
                <section key={group.id} id={group.id} className="scroll-mt-24">
                    <h2 className="text-xl md:text-2xl font-semibold mb-3">{group.title}</h2>
                    <Accordion type="multiple" className="rounded-lg border border-border px-4 bg-card">
                        {group.items.map((item, i) => (
                            <AccordionItem key={item.q} value={`${group.id}-${i}`}>
                                <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </section>
            ))}
        </div>
    );
}
