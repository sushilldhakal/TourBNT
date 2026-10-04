'use client';

import { useState } from 'react';
import { createConversation } from '@/lib/api/conversations';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';

export default function ContactPage() {
    const { user } = useAuth();
    const isLoggedIn = !!user?.id;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Prefill from the signed-in account (adjusted while rendering, once per account).
    const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
    if (isLoggedIn && user.id && prefilledFor !== user.id) {
        setPrefilledFor(user.id);
        setFormData((prev) => ({
            ...prev,
            name: user.name ?? prev.name,
            email: user.email ?? prev.email,
            phone: user.phone ?? prev.phone,
        }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const phone = (isLoggedIn ? user.phone : formData.phone) || formData.phone;
            const message = [formData.message, phone ? `Phone: ${phone}` : '']
                .filter(Boolean)
                .join('\n\n');

            const payload: Parameters<typeof createConversation>[0] = {
                type: 'contact',
                subject: formData.subject || 'General Inquiry',
                message,
            };

            if (!isLoggedIn) {
                payload.guestName = formData.name;
                payload.guestEmail = formData.email;
            }

            await createConversation(payload);

            toast({
                title: 'Message sent',
                description:
                    "We've received your message. We'll reply in your enquiries page as soon as possible.",
            });
            setFormData({
                name: '',
                email: '',
                phone: '',
                subject: '',
                message: '',
            });
        } catch (err: unknown) {
            const msg = (err as { message?: string })?.message ?? 'Failed to send message';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
                    <p className="text-xl text-muted-foreground">
                        Have questions? We&apos;d love to hear from you.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Information */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-card border border-border rounded-lg p-6">
                            <h3 className="font-semibold mb-4">Get in Touch</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Phone</p>
                                    <p className="font-medium">+61 0433 926 079</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                                    <p className="font-medium">info@TourBNT.com</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Address</p>
                                    <p className="font-medium">123 Travel Street<br />Sydney, NSW 2000<br />Australia</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-6">
                            <h3 className="font-semibold mb-4">Business Hours</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Monday - Friday</span>
                                    <span className="font-medium">8:00 - 18:00</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Saturday</span>
                                    <span className="font-medium">9:00 - 15:00</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Sunday</span>
                                    <span className="font-medium">Closed</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-card border border-border rounded-lg p-8">
                            <h2 className="text-2xl font-semibold mb-6">Send us a Message</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {!isLoggedIn ? (
                                        <>
                                            <div>
                                                <label htmlFor="name" className="block text-sm font-medium mb-2">
                                                    Full Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    name="name"
                                                    required={!isLoggedIn}
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    htmlFor="email"
                                                    className="block text-sm font-medium mb-2"
                                                >
                                                    Email Address *
                                                </label>
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    required={!isLoggedIn}
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    placeholder="john@example.com"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="md:col-span-2 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
                                            <p className="font-medium text-foreground">
                                                We&apos;ll use your profile details for this message.
                                            </p>
                                            <p className="text-muted-foreground mt-1">
                                                {user.name && <span className="mr-2">{user.name}</span>}
                                                {user.email && (
                                                    <span className="mr-2">
                                                        · <span className="font-medium">{user.email}</span>
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-medium mb-2">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="+61 123 456 789"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="subject" className="block text-sm font-medium mb-2">
                                            Subject *
                                        </label>
                                        <select
                                            id="subject"
                                            name="subject"
                                            required
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            <option value="">Select a subject</option>
                                            <option value="general">General Inquiry</option>
                                            <option value="booking">Booking Question</option>
                                            <option value="support">Customer Support</option>
                                            <option value="feedback">Feedback</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                                        Message *
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required
                                        rows={6}
                                        value={formData.message}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                        placeholder="Tell us how we can help you..."
                                    />
                                </div>

                                <TurnstileWidget />

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-70"
                                >
                                    {isSubmitting ? 'Sending...' : 'Send Message'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
