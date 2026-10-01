'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
export const num = (n: number) => n.toLocaleString();

/** A headline number. Pass `href` to make the whole card a link; `tone` colours the value when it needs attention. */
export function StatCard({ icon: Icon, label, value, hint, href, tone }: {
    icon: LucideIcon; label: string; value: string | number; hint?: string; href?: string; tone?: 'warn' | 'bad' | 'good';
}) {
    const toneClass = tone === 'warn' ? 'text-amber-500' : tone === 'bad' ? 'text-red-500' : tone === 'good' ? 'text-emerald-500' : '';
    const body = (
        <Card className={`h-full ${href ? 'hover:shadow-md hover:border-primary/40 transition' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><Icon className="h-4 w-4 text-primary" /></div>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
                {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
            </CardContent>
        </Card>
    );
    return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

export function Section({ title, action, children }: { title: string; action?: { label: string; href: string }; children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{title}</CardTitle>
                {action && <Link href={action.href} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">{action.label}<ArrowRight className="h-3 w-3" /></Link>}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

export function Empty({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-muted-foreground py-2">{children}</p>;
}

const TONES: Record<string, string> = {
    pending: 'status-pill status-pill--pending',
    held: 'status-pill status-pill--held',
    countered: 'status-pill status-pill--countered',
    confirmed: 'status-pill status-pill--confirmed',
    approved: 'status-pill status-pill--approved',
    completed: 'status-pill status-pill--held',
    declined: 'status-pill status-pill--declined',
    rejected: 'status-pill status-pill--rejected',
    cancelled: 'status-pill status-pill--cancelled',
    expired: 'status-pill status-pill--expired',
    unpaid: 'status-pill status-pill--declined',
    partial: 'status-pill status-pill--pending',
    paid: 'status-pill status-pill--confirmed',
    refunded: 'status-pill status-pill--expired',
};

export function StatusBadge({ status }: { status: string }) {
    return <Badge variant="outline" className={`capitalize ${TONES[status] ?? ''}`}>{status}</Badge>;
}
