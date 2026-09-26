'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { getPendingBusinessPartners, approveBusinessPartner, rejectBusinessPartner, BusinessPartner } from '@/lib/api/businessPartners';

export default function BusinessPartnersAdminPage() {
    const queryClient = useQueryClient();
    const [rejectTarget, setRejectTarget] = useState<BusinessPartner | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['business-partners', 'pending'],
        queryFn: () => getPendingBusinessPartners(1, 50),
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => approveBusinessPartner(id),
        onSuccess: () => {
            toast({ title: 'Business approved' });
            queryClient.invalidateQueries({ queryKey: ['business-partners', 'pending'] });
        },
        onError: (error: Error) => toast({ title: 'Failed to approve', description: error.message, variant: 'destructive' }),
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectBusinessPartner(id, reason),
        onSuccess: () => {
            toast({ title: 'Business rejected' });
            setRejectTarget(null);
            setRejectReason('');
            queryClient.invalidateQueries({ queryKey: ['business-partners', 'pending'] });
        },
        onError: (error: Error) => toast({ title: 'Failed to reject', description: error.message, variant: 'destructive' }),
    });

    const applications = data?.data ?? [];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Business Partner Applications</h1>
                <p className="text-muted-foreground">Review and approve guides, hotels, guesthouses, restaurants, transport providers and advertisers.</p>
            </div>

            {isLoading && <p className="text-muted-foreground">Loading...</p>}
            {!isLoading && applications.length === 0 && (
                <Card><CardContent className="py-10 text-center text-muted-foreground">No pending applications.</CardContent></Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {applications.map((partner) => (
                    <Card key={partner.id}>
                        <CardHeader className="flex flex-row items-start justify-between space-y-0">
                            <div>
                                <CardTitle className="text-lg">{partner.name}</CardTitle>
                                <Badge variant="secondary" className="mt-1 capitalize">{partner.type}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground line-clamp-3">{partner.description}</p>
                            <div className="text-sm space-y-1">
                                {partner.email && <div><span className="text-muted-foreground">Email:</span> {partner.email}</div>}
                                {partner.phone && <div><span className="text-muted-foreground">Phone:</span> {partner.phone}</div>}
                                {partner.website && <div><span className="text-muted-foreground">Website:</span> {partner.website}</div>}
                            </div>
                            {partner.documents && partner.documents.length > 0 && (
                                <div>
                                    <div className="text-sm font-medium mb-1">Documents</div>
                                    <div className="flex flex-wrap gap-2">
                                        {partner.documents.map((doc) => (
                                            <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer" className="text-xs underline text-primary">
                                                {doc.docType}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2 pt-2">
                                <Button size="sm" onClick={() => approveMutation.mutate(partner.id)} disabled={approveMutation.isPending}>
                                    Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setRejectTarget(partner)}>
                                    Reject
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject {rejectTarget?.name}</DialogTitle>
                    </DialogHeader>
                    <Textarea
                        placeholder="Reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={4}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            disabled={!rejectReason.trim() || rejectMutation.isPending}
                            onClick={() => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason })}
                        >
                            Reject Application
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
