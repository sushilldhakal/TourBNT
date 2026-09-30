'use client';

import { AdminGuard } from '@/components/dashboard/RoleGuard';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import { Card, CardContent } from '@/components/ui/card';
import { useOperationsSummary } from '@/lib/queries';
import { Gauge, Building2, Utensils, Compass, Truck, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
    return (
        <Card>
            <CardContent className="py-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-2xl font-semibold leading-none">{value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function AlertRow({ severity, label, count }: { severity: 'critical' | 'warning' | 'good'; label: string; count: number }) {
    const meta = {
        critical: { icon: AlertCircle, className: 'text-destructive bg-destructive/5 border-destructive/20' },
        warning: { icon: AlertTriangle, className: 'text-amber-600 bg-amber-50 border-amber-200' },
        good: { icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    }[severity];
    const Icon = meta.icon;

    return (
        <div className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm ${meta.className}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="font-medium">{count}</span>
            <span>{label}</span>
        </div>
    );
}

export default function OperationsPage() {
    const { data, isLoading } = useOperationsSummary();

    return (
        <AdminGuard>
            <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
                <DashboardCardHeader
                    variant="compact"
                    icon={Gauge}
                    badge="Operations"
                    title="Today's Operations"
                    description="A live snapshot across every trip and supplier — the control center for TourBNT staff."
                />

                {isLoading || !data ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <StatTile icon={Gauge} label="Active Trips" value={data.activeTrips} />
                            <StatTile icon={Building2} label="Hotels" value={data.partnerCounts.hotels} />
                            <StatTile icon={Utensils} label="Restaurants" value={data.partnerCounts.restaurants} />
                            <StatTile icon={Compass} label="Guides" value={data.partnerCounts.guides} />
                            <StatTile icon={Truck} label="Vehicles" value={data.partnerCounts.vehicles} />
                        </div>

                        <Card>
                            <CardContent className="py-5 space-y-2">
                                <p className="text-sm font-medium mb-1">Alerts</p>
                                <AlertRow severity="critical" label="supplier confirmations missing" count={data.alerts.missingConfirmations} />
                                <AlertRow severity="warning" label="hotel requests unavailable (declined/expired)" count={data.alerts.hotelUnavailable} />
                                <AlertRow severity="warning" label="transport requests unavailable (declined/expired)" count={data.alerts.transportMissing} />
                                <AlertRow severity="critical" label="guides declined" count={data.alerts.guidesCancelled} />
                                <AlertRow severity="good" label="bookings confirmed" count={data.alerts.bookingsConfirmed} />
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AdminGuard>
    );
}
