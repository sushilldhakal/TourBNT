'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Fingerprint, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { addPasskey, listPasskeys, passkeyErrorMessage, passkeysSupported, removePasskey, type Passkey } from '@/lib/api/passkeys';

const KEY = ['passkeys'];

/** A sensible default name for a passkey made on this device. */
function thisDeviceName(): string {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android phone';
    if (/Macintosh/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows PC';
    return 'This device';
}

/** Profile → Security: add and remove passkeys (sign in with fingerprint, face or screen lock). */
export function PasskeyManager() {
    const qc = useQueryClient();
    const [supported, setSupported] = useState<boolean | null>(null);
    useEffect(() => { passkeysSupported().then(setSupported).catch(() => setSupported(false)); }, []);

    const { data: keys = [], isLoading } = useQuery({ queryKey: KEY, queryFn: listPasskeys });

    const add = useMutation({
        mutationFn: () => addPasskey(thisDeviceName()),
        onSuccess: (list) => { qc.setQueryData(KEY, list); toast.success('Passkey added. Next time, choose "Sign in with fingerprint or face".'); },
        onError: (e) => toast.error(passkeyErrorMessage(e, 'The passkey could not be added.')),
    });
    const remove = useMutation({
        mutationFn: (id: string) => removePasskey(id),
        onSuccess: (list) => { qc.setQueryData(KEY, list); toast.success('Passkey removed'); },
        onError: (e) => toast.error(passkeyErrorMessage(e, 'The passkey could not be removed.')),
    });

    const describe = (k: Passkey) =>
        `Added ${format(new Date(k.createdAt), 'd MMM yyyy')}` + (k.lastUsedAt ? ` · last used ${format(new Date(k.lastUsedAt), 'd MMM yyyy')}` : ' · not used yet');

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5" aria-hidden="true" />Passkeys</CardTitle>
                <CardDescription>
                    Sign in with your fingerprint, face or device screen lock instead of your password. Your fingerprint and face never leave your device.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : keys.length === 0 ? (
                    <p className="text-sm text-muted-foreground">You have no passkeys yet.</p>
                ) : (
                    <ul className="divide-y divide-border rounded-lg border border-border">
                        {keys.map((k) => (
                            <li key={k.id} className="flex items-center gap-3 p-3">
                                <Fingerprint className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">
                                        {k.name || 'Passkey'}
                                        {k.backedUp && <Badge variant="secondary" className="ml-2 align-middle">Synced</Badge>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{describe(k)}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Remove ${k.name || 'passkey'}`}
                                    disabled={remove.isPending}
                                    onClick={() => { if (confirm(`Remove "${k.name || 'Passkey'}"? You will not be able to sign in with it any more.`)) remove.mutate(k.id); }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}

                {supported === false ? (
                    <p className="text-sm text-muted-foreground">This browser can&apos;t create passkeys. Try a recent version of Chrome, Safari, Edge or Firefox.</p>
                ) : (
                    <Button onClick={() => add.mutate()} disabled={!supported || add.isPending}>
                        {add.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4 mr-2" aria-hidden="true" />}
                        Add a passkey on this device
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
