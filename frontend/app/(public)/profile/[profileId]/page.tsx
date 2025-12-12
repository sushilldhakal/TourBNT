'use client';

import { useLayout } from '@/providers/LayoutProvider';
import { useParams } from 'next/navigation';
import { useState } from 'react';

export default function ProfilePage() {
    const { isFullWidth } = useLayout();
    const params = useParams();
    const profileId = params.profileId;

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        bio: '',
    });

    // TODO: Fetch user profile from API

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Update profile via API
        setIsEditing(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className={`${isFullWidth ? 'container-fluid' : 'container'} mx-auto px-4 py-16 transition-all duration-300`}>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Profile</h1>
                        <p className="text-muted-foreground">Profile ID: {profileId}</p>
                    </div>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-6 py-2 border border-primary text-primary rounded-lg hover:bg-accent transition"
                    >
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-card border border-border rounded-lg p-6 text-center">
                            <div className="w-32 h-32 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                                <span className="text-4xl text-primary">👤</span>
                            </div>
                            <h2 className="text-xl font-semibold mb-2">User Name</h2>
                            <p className="text-sm text-muted-foreground mb-4">user@example.com</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Member Since:</span>
                                    <span className="font-medium">2024</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Bookings:</span>
                                    <span className="font-medium">0</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Content */}
                    <div className="lg:col-span-2">
                        {isEditing ? (
                            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6">
                                <h2 className="text-xl font-semibold mb-6">Edit Profile</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Phone</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Address</label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">City</label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Country</label>
                                            <select
                                                name="country"
                                                value={formData.country}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                            >
                                                <option value="">Select Country</option>
                                                <option value="AU">Australia</option>
                                                <option value="US">United States</option>
                                                <option value="UK">United Kingdom</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Bio</label>
                                        <textarea
                                            name="bio"
                                            rows={4}
                                            value={formData.bio}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition font-medium"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-card border border-border rounded-lg p-6">
                                <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                                        <p className="font-medium">-</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Email</p>
                                        <p className="font-medium">-</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Phone</p>
                                        <p className="font-medium">-</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Address</p>
                                        <p className="font-medium">-</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Bio</p>
                                        <p className="font-medium">-</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
