'use client';

import { useLayout } from '@/providers/LayoutProvider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { applyAsBusinessPartner, BusinessPartnerType } from '@/lib/api/businessPartners';
import { getApprovedDestinations } from '@/lib/api/globalApi';
import { listFrom } from '@/lib/api/apiClient';
import { useAuth } from '@/lib/hooks/useAuth';

const PARTNER_TYPES: { value: BusinessPartnerType; label: string; blurb: string }[] = [
    { value: 'guide', label: 'Tour Guide', blurb: 'Lead treks, tours and local experiences' },
    { value: 'hotel', label: 'Hotel', blurb: 'Offer accommodation for travelers' },
    { value: 'guesthouse', label: 'Guesthouse', blurb: 'Offer local homestay-style lodging' },
    { value: 'restaurant', label: 'Restaurant', blurb: 'Feature your food for travelers nearby' },
    { value: 'transport', label: 'Transport / Logistics', blurb: 'Provide vehicles, drivers and route logistics' },
    { value: 'advertiser', label: 'Advertiser', blurb: 'Promote gear, services or products to relevant travelers' },
];

const DOC_FIELDS: { name: string; label: string }[] = [
    { name: 'businessRegistration', label: 'Business Registration' },
    { name: 'taxRegistration', label: 'Tax Registration' },
    { name: 'idVerification', label: 'ID Verification' },
    { name: 'businessLicense', label: 'Business License (if applicable)' },
];

export default function ApplyPartnerPage() {
    const { isFullWidth } = useLayout();
    const router = useRouter();
    const { isAuthenticated, isHydrated } = useAuth();

    const [destinations, setDestinations] = useState<Array<{ id: string; name: string }>>([]);
    const [type, setType] = useState<BusinessPartnerType | ''>('');
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', website: '', destinationId: '',
        address: '', city: '', country: '', description: '', agreeTerms: false,
    });
    const [files, setFiles] = useState<Record<string, File | null>>({});

    useEffect(() => {
        getApprovedDestinations()
            .then((data) => setDestinations(listFrom<{ id: string; name: string }>(data, 'data', 'items')))
            .catch(() => setDestinations([]));
    }, []);

    const mutation = useMutation({
        mutationFn: (fd: FormData) => applyAsBusinessPartner(fd),
        onSuccess: () => {
            toast({ title: 'Application submitted', description: 'Our team will review it and get back to you soon.' });
            router.push('/');
        },
        onError: (error: Error) => {
            toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
        },
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type: inputType } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: inputType === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleFileChange = (name: string, file: File | null) => {
        setFiles((prev) => ({ ...prev, [name]: file }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast({ title: 'Please sign in first', description: 'You need an account before applying as a business partner.', variant: 'destructive' });
            router.push('/auth/login?redirect=/apply-partner');
            return;
        }
        if (!type) {
            toast({ title: 'Select a business type', variant: 'destructive' });
            return;
        }

        const fd = new FormData();
        fd.append('type', type);
        fd.append('name', formData.name);
        fd.append('email', formData.email);
        fd.append('phone', formData.phone);
        fd.append('website', formData.website);
        fd.append('description', formData.description);
        if (formData.destinationId) fd.append('destinationId', formData.destinationId);
        fd.append('address', JSON.stringify({ address: formData.address, city: formData.city, country: formData.country }));

        Object.entries(files).forEach(([field, file]) => {
            if (file) fd.append(field, file);
        });

        mutation.mutate(fd);
    };

    if (isHydrated && !isAuthenticated) {
        return (
            <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 text-center`}>
                <h1 className="text-3xl font-bold mb-4">Sign in to apply</h1>
                <p className="text-muted-foreground mb-6">You need an account to submit a business partner application.</p>
                <a href="/auth/login?redirect=/apply-partner" className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium">Sign In</a>
            </div>
        );
    }

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Become a Business Partner</h1>
                    <p className="text-xl text-muted-foreground">
                        Guides, hotels, guesthouses, restaurants, transport providers and advertisers — get listed,
                        linked in tour itineraries, and reviewed by travelers.
                    </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-8">
                    <h2 className="text-2xl font-semibold mb-6">Choose your business type</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {PARTNER_TYPES.map((pt) => (
                            <button
                                type="button"
                                key={pt.value}
                                onClick={() => setType(pt.value)}
                                className={`text-left border rounded-lg p-4 transition ${type === pt.value ? 'border-primary ring-2 ring-primary/40 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                            >
                                <div className="font-semibold mb-1">{pt.label}</div>
                                <div className="text-sm text-muted-foreground">{pt.blurb}</div>
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium mb-2">Business Name *</label>
                                <input type="text" id="name" name="name" required value={formData.name} onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Your business name" />
                            </div>
                            <div>
                                <label htmlFor="destinationId" className="block text-sm font-medium mb-2">Primary Destination</label>
                                <select id="destinationId" name="destinationId" value={formData.destinationId} onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent">
                                    <option value="">Select destination</option>
                                    {destinations.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium mb-2">Email Address *</label>
                                <input type="email" id="email" name="email" required value={formData.email} onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="business@example.com" />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium mb-2">Phone Number *</label>
                                <input type="tel" id="phone" name="phone" required value={formData.phone} onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="+977 123 456 789" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium mb-2">Address</label>
                                <input type="text" id="address" name="address" value={formData.address} onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent" />
                            </div>
                            <div>
                                <label htmlFor="city" className="block text-sm font-medium mb-2">City</label>
                                <input type="text" id="city" name="city" value={formData.city} onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent" />
                            </div>
                            <div>
                                <label htmlFor="country" className="block text-sm font-medium mb-2">Country</label>
                                <input type="text" id="country" name="country" value={formData.country} onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="website" className="block text-sm font-medium mb-2">Website (Optional)</label>
                            <input type="url" id="website" name="website" value={formData.website} onChange={handleChange}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="https://yourbusiness.com" />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium mb-2">Tell us about your business *</label>
                            <textarea id="description" name="description" required rows={6} value={formData.description} onChange={handleChange}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                placeholder="Describe your services and what makes you a great fit for travelers..." />
                        </div>

                        <div>
                            <h3 className="text-sm font-medium mb-3">Verification Documents</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {DOC_FIELDS.map((doc) => (
                                    <div key={doc.name}>
                                        <label htmlFor={doc.name} className="block text-sm text-muted-foreground mb-1">{doc.label}</label>
                                        <input
                                            type="file"
                                            id={doc.name}
                                            accept="image/jpeg,image/png,application/pdf"
                                            onChange={(e) => handleFileChange(doc.name, e.target.files?.[0] || null)}
                                            className="w-full text-sm border border-border rounded-md bg-background file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-start">
                            <input type="checkbox" id="agreeTerms" name="agreeTerms" required checked={formData.agreeTerms} onChange={handleChange} className="mt-1 mr-3" />
                            <label htmlFor="agreeTerms" className="text-sm text-muted-foreground">
                                I agree to the terms and conditions and understand that my application will be reviewed by the TourBNT team. *
                            </label>
                        </div>

                        <button type="submit" disabled={mutation.isPending}
                            className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-60">
                            {mutation.isPending ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </form>
                </div>

                <div className="mt-8 bg-accent/50 border border-border rounded-lg p-6">
                    <h3 className="font-semibold mb-3">What happens next?</h3>
                    <ol className="space-y-2 text-sm text-muted-foreground">
                        <li>1. Our team reviews your documents and profile</li>
                        <li>2. Once approved, your account gets a limited dashboard for your business only</li>
                        <li>3. Tour agents can link your business into itineraries, and travelers can leave reviews</li>
                        <li>4. Advertisers and service providers can also set up targeted, contextual ad campaigns</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
