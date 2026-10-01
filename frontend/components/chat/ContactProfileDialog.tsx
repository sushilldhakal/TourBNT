'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { BadgeCheck, Building2, CalendarDays, Globe, Mail, MapPin, Phone, Megaphone, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getConversationPeople, type ConversationPerson } from '@/lib/api/conversations';

const initials = (name?: string | null) =>
    (name ?? '?').split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2) || '?';

function Row({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 text-sm">
            <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className="break-words">{children}</div>
            </div>
        </div>
    );
}

function PersonCard({ person }: { person: ConversationPerson }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                    {person.avatar && <AvatarImage src={person.avatar} alt={person.name} />}
                    <AvatarFallback>{initials(person.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <p className="text-base font-semibold truncate flex items-center gap-1.5">
                        {person.name}
                        {person.verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" aria-label="Verified" />}
                    </p>
                    <Badge variant="secondary" className="capitalize mt-1">{person.role}</Badge>
                </div>
            </div>

            <div className="space-y-3">
                <Row icon={Mail} label="Email"><a href={`mailto:${person.email}`} className="text-primary hover:underline">{person.email}</a></Row>
                <Row icon={Phone} label="Phone">
                    {person.phone ? <a href={`tel:${person.phone}`} className="text-primary hover:underline">{person.phone}</a> : <span className="text-muted-foreground">Not provided</span>}
                </Row>
                {person.company && <Row icon={Building2} label="Company">{person.company}</Row>}
                {person.businesses.length > 0 && (
                    <Row icon={Building2} label="Listings">
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {person.businesses.map((b) => <Badge key={`${b.name}-${b.type}`} variant="outline" className="capitalize">{b.name} · {b.type}</Badge>)}
                        </div>
                    </Row>
                )}
                {person.location && <Row icon={MapPin} label="Location">{person.location}</Row>}
                {person.website && <Row icon={Globe} label="Website"><a href={person.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{person.website}</a></Row>}
                <Row icon={CalendarDays} label="Member since">{format(new Date(person.memberSince), 'PPP')}</Row>
            </div>
        </div>
    );
}

/** Opens from the chat header: who is this person (email, phone, company…) so similar names can be told apart. */
export function ContactProfileDialog({ conversationId, name, open, onOpenChange }: { conversationId: string; name: string; open: boolean; onOpenChange: (open: boolean) => void }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['conversation-people', conversationId],
        queryFn: () => getConversationPeople(conversationId),
        enabled: open && !!conversationId,
        staleTime: 5 * 60_000,
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Contact details</DialogTitle>
                    <DialogDescription>Who you are chatting with in this conversation.</DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="space-y-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>
                ) : isError || !data ? (
                    <p className="text-sm text-muted-foreground">Couldn&apos;t load the details for {name}.</p>
                ) : data.isBroadcast ? (
                    <div className="flex items-center gap-3 text-sm">
                        <Megaphone className="h-5 w-5 text-muted-foreground" />
                        <p>This is a broadcast sent to {data.recipientCount?.toLocaleString() ?? 'many'} recipients.</p>
                    </div>
                ) : data.people.length > 0 || data.guest || (data.others?.length ?? 0) > 0 ? (
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                        {data.guest && (
                            <div className="space-y-3">
                                <Row icon={User} label="Visitor (no account)">{data.guest.name ?? 'Unknown'}</Row>
                                {data.guest.email && <Row icon={Mail} label="Email"><a href={`mailto:${data.guest.email}`} className="text-primary hover:underline">{data.guest.email}</a></Row>}
                            </div>
                        )}
                        {data.people.map((p) => <PersonCard key={p.id} person={p} />)}
                        {(data.others?.length ?? 0) > 0 && (
                            <div className="space-y-4 border-t pt-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{data.guest || data.people.length ? 'Also in this conversation' : 'People'}</p>
                                {data.others.map((p) => <PersonCard key={p.id} person={p} />)}
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No further details are available for {name}.</p>
                )}
            </DialogContent>
        </Dialog>
    );
}
