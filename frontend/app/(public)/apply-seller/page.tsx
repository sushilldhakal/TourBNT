'use client';

import { useLayout } from '@/providers/LayoutProvider';
import { useState } from 'react';

export default function ApplySellerPage() {
    const { isFullWidth } = useLayout();
    const [formData, setFormData] = useState({
        businessName: '',
        contactName: '',
        email: '',
        phone: '',
        website: '',
        businessType: '',
        experience: '',
        description: '',
        agreeTerms: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Submit application to API
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        });
    };

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Become a Seller</h1>
                    <p className="text-xl text-muted-foreground">
                        Join our platform and start offering your tours to travelers worldwide
                    </p>
                </div>

                {/* Benefits Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-card border border-border rounded-lg p-6 text-center">
                        <div className="text-4xl mb-3">🌍</div>
                        <h3 className="font-semibold mb-2">Global Reach</h3>
                        <p className="text-sm text-muted-foreground">
                            Access to thousands of travelers worldwide
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-6 text-center">
                        <div className="text-4xl mb-3">💼</div>
                        <h3 className="font-semibold mb-2">Easy Management</h3>
                        <p className="text-sm text-muted-foreground">
                            Powerful dashboard to manage your tours
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-6 text-center">
                        <div className="text-4xl mb-3">💰</div>
                        <h3 className="font-semibold mb-2">Competitive Rates</h3>
                        <p className="text-sm text-muted-foreground">
                            Low commission rates and fast payouts
                        </p>
                    </div>
                </div>

                {/* Application Form */}
                <div className="bg-card border border-border rounded-lg p-8">
                    <h2 className="text-2xl font-semibold mb-6">Application Form</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="businessName" className="block text-sm font-medium mb-2">
                                    Business Name *
                                </label>
                                <input
                                    type="text"
                                    id="businessName"
                                    name="businessName"
                                    required
                                    value={formData.businessName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Your Tour Company"
                                />
                            </div>
                            <div>
                                <label htmlFor="contactName" className="block text-sm font-medium mb-2">
                                    Contact Name *
                                </label>
                                <input
                                    type="text"
                                    id="contactName"
                                    name="contactName"
                                    required
                                    value={formData.contactName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium mb-2">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="business@example.com"
                                />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                                    Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="+61 123 456 789"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="website" className="block text-sm font-medium mb-2">
                                    Website (Optional)
                                </label>
                                <input
                                    type="url"
                                    id="website"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="https://yourwebsite.com"
                                />
                            </div>
                            <div>
                                <label htmlFor="businessType" className="block text-sm font-medium mb-2">
                                    Business Type *
                                </label>
                                <select
                                    id="businessType"
                                    name="businessType"
                                    required
                                    value={formData.businessType}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="">Select type</option>
                                    <option value="tour-operator">Tour Operator</option>
                                    <option value="travel-agency">Travel Agency</option>
                                    <option value="individual">Individual Guide</option>
                                    <option value="hotel">Hotel/Resort</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="experience" className="block text-sm font-medium mb-2">
                                Years of Experience *
                            </label>
                            <select
                                id="experience"
                                name="experience"
                                required
                                value={formData.experience}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="">Select experience</option>
                                <option value="0-1">Less than 1 year</option>
                                <option value="1-3">1-3 years</option>
                                <option value="3-5">3-5 years</option>
                                <option value="5-10">5-10 years</option>
                                <option value="10+">10+ years</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium mb-2">
                                Tell us about your business *
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                required
                                rows={6}
                                value={formData.description}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                placeholder="Describe your business, the types of tours you offer, and what makes you unique..."
                            />
                        </div>

                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                id="agreeTerms"
                                name="agreeTerms"
                                required
                                checked={formData.agreeTerms}
                                onChange={handleChange}
                                className="mt-1 mr-3"
                            />
                            <label htmlFor="agreeTerms" className="text-sm text-muted-foreground">
                                I agree to the terms and conditions and understand that my application will be reviewed by the TourBNT team. *
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition font-medium"
                        >
                            Submit Application
                        </button>
                    </form>
                </div>

                {/* Additional Info */}
                <div className="mt-8 bg-accent/50 border border-border rounded-lg p-6">
                    <h3 className="font-semibold mb-3">What happens next?</h3>
                    <ol className="space-y-2 text-sm text-muted-foreground">
                        <li>1. We'll review your application within 2-3 business days</li>
                        <li>2. Our team may contact you for additional information</li>
                        <li>3. Once approved, you'll receive access to your seller dashboard</li>
                        <li>4. Complete your profile and start adding your tours</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
