'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, UserPlus, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { subscribeEmail } from '@/lib/api/subscribers';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from "sonner"

// Email validation helper
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

export function AddSubscriber() {
    const [singleEmail, setSingleEmail] = useState('');
    const [bulkEmails, setBulkEmails] = useState('');
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
    const queryClient = useQueryClient();

    const subscribeMutation = useMutation({
        mutationFn: (emailInput: string) => subscribeEmail(emailInput),
        onSuccess: (result) => {
            if (result.failedCount === 0) {
                toast.success(
                    result.successCount === 1 
                        ? 'Subscriber added successfully'
                        : `Successfully added ${result.successCount} subscriber(s)`
                );
            } else {
                toast.warning(
                    `Added ${result.successCount} subscriber(s), ${result.failedCount} failed`,
                    { duration: 5000 }
                );
            }
            setSingleEmail('');
            setBulkEmails('');
            queryClient.invalidateQueries({ queryKey: ['subscribers'] });
        },
        onError: (error: any) => {
            // Try to extract results from error response
            if (error?.response?.data?.error?.details && Array.isArray(error.response.data.error.details)) {
                const failedCount = error.response.data.error.details.length;
                toast.error(`Failed to add ${failedCount} subscriber(s). Please check the email addresses.`);
            } else {
                const message = error?.response?.data?.error?.message || error?.message || 'Failed to add subscriber';
                toast.error(message);
            }
        },
    });

    const handleSingleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const emailInput = singleEmail.trim();
        if (!emailInput) {
            toast.error('Please enter an email address');
            return;
        }
        subscribeMutation.mutate(emailInput);
    };

    const handleBulkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const emailInput = bulkEmails.trim();
        if (!emailInput) {
            toast.error('Please enter at least one email address');
            return;
        }

        // Parse emails: support both comma/semicolon separated and newline separated
        const emailArray = emailInput
            .split(/[,;\n]\s*/)
            .map(email => email.trim())
            .filter(email => email !== '');

        if (emailArray.length === 0) {
            toast.error('Please enter at least one valid email address');
            return;
        }

        // Validate email format
        const validEmails = emailArray.filter(isValidEmail);
        const invalidEmails = emailArray.filter(email => !isValidEmail(email));

        if (invalidEmails.length > 0) {
            toast.error(`Invalid email format: ${invalidEmails.join(', ')}`);
            return;
        }

        // Join valid emails with comma and send to API
        subscribeMutation.mutate(validEmails.join(', '));
    };

    const parseResults = () => {
        if (!subscribeMutation.data) return null;
        const { successful, failed } = subscribeMutation.data;
        return { successful, failed };
    };

    const results = parseResults();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Add Subscriber
                </CardTitle>
                <CardDescription>
                    Add single or multiple email addresses to the newsletter subscription list
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'single' | 'bulk')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="single">Single Email</TabsTrigger>
                        <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
                    </TabsList>

                    <TabsContent value="single" className="space-y-4">
                        <form onSubmit={handleSingleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="single-email">Email Address</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="single-email"
                                        type="text"
                                        placeholder="user@example.com or user1@example.com, user2@example.com"
                                        value={singleEmail}
                                        onChange={(e) => setSingleEmail(e.target.value)}
                                        disabled={subscribeMutation.isPending}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={subscribeMutation.isPending || !singleEmail.trim()}
                                    >
                                        {subscribeMutation.isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Adding...
                                            </>
                                        ) : (
                                            <>
                                                <Mail className="h-4 w-4 mr-2" />
                                                Add
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="bulk" className="space-y-4">
                        <form onSubmit={handleBulkSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="bulk-emails">
                                    Email Addresses (one per line)
                                </Label>
                                <Textarea
                                    id="bulk-emails"
                                    placeholder="user1@example.com, user2@example.com; user3@example.com&#10;or one per line"
                                    value={bulkEmails}
                                    onChange={(e) => setBulkEmails(e.target.value)}
                                    disabled={subscribeMutation.isPending}
                                    rows={8}
                                    className="font-mono text-sm"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Enter emails separated by commas, semicolons, or one per line. Invalid emails will be skipped.
                                </p>
                            </div>
                            <Button
                                type="submit"
                                disabled={subscribeMutation.isPending || !bulkEmails.trim()}
                                className="w-full"
                            >
                                {subscribeMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Adding Subscribers...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Add All Subscribers
                                    </>
                                )}
                            </Button>
                        </form>

                        {results && (
                            <div className="space-y-2 mt-4">
                                {results.successful.length > 0 && (
                                    <Alert>
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <AlertDescription>
                                            <strong>Successfully added:</strong> {results.successful.length} subscriber(s)
                                        </AlertDescription>
                                    </Alert>
                                )}
                                {results.failed.length > 0 && (
                                    <Alert variant="destructive">
                                        <XCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            <strong>Failed to add:</strong> {results.failed.length} subscriber(s)
                                            <ul className="mt-2 list-disc list-inside text-sm">
                                                {results.failed.slice(0, 5).map((item, idx) => (
                                                    <li key={idx}>
                                                        {item.email}: {item.error}
                                                    </li>
                                                ))}
                                                {results.failed.length > 5 && (
                                                    <li>... and {results.failed.length - 5} more</li>
                                                )}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

