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

// `!text-*` because Badge's own text-foreground would otherwise win.
const TONES: Record<string, string> = {
    pending: 'bg-amber-500/15 border-amber-500/30 !text-amber-700 dark:!text-amber-300',
    held: 'bg-blue-500/15 border-blue-500/30 !text-blue-700 dark:!text-blue-300',
    countered: 'bg-amber-500/15 border-amber-500/30 !text-amber-700 dark:!text-amber-300',
    confirmed: 'bg-emerald-500/15 border-emerald-500/30 !text-emerald-700 dark:!text-emerald-300',
    approved: 'bg-emerald-500/15 border-emerald-500/30 !text-emerald-700 dark:!text-emerald-300',
    completed: 'bg-blue-500/15 border-blue-500/30 !text-blue-700 dark:!text-blue-300',
    declined: 'bg-red-500/15 border-red-500/30 !text-red-700 dark:!text-red-300',
    rejected: 'bg-red-500/15 border-red-500/30 !text-red-700 dark:!text-red-300',
    cancelled: 'bg-red-500/15 border-red-500/30 !text-red-700 dark:!text-red-300',
    expired: 'bg-zinc-500/15 border-zinc-500/30 !text-zinc-600 dark:!text-zinc-300',
    unpaid: 'bg-red-500/15 border-red-500/30 !text-red-700 dark:!text-red-300',
    partial: 'bg-amber-500/15 border-amber-500/30 !text-amber-700 dark:!text-amber-300',
    paid: 'bg-emerald-500/15 border-emerald-500/30 !text-emerald-700 dark:!text-emerald-300',
    refunded: 'bg-zinc-500/15 border-zinc-500/30 !text-zinc-600 dark:!text-zinc-300',
};

export function StatusBadge({ status }: { status: string }) {
    return <Badge variant="outline" className={`capitalize ${TONES[status] ?? ''}`}>{status}</Badge>;
}
