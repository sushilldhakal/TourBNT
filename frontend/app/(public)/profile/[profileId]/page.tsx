'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUserById, updateUser } from '@/lib/api/users';
import { useToast } from '@/components/ui/use-toast';

interface ProfileUser {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    bio?: string;
    createdAt?: string;
}

export default function ProfilePage() {
    const params = useParams();
    const profileId = typeof params.profileId === 'string' ? params.profileId : '';
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    const [profile, setProfile] = useState<ProfileUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        bio: '',
    });

    const isOwnProfile = !!currentUser?.id && (currentUser.id === profileId || currentUser.id === (profile as { _id?: string })?._id);

    useEffect(() => {
        if (!profileId) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        getUserById(profileId)
            .then((raw) => {
                if (cancelled) return;
                const data = raw as ProfileUser;
                setProfile(data);
                const u = data as Record<string, unknown>;
                setFormData({
                    name: (u.name as string) ?? '',
                    email: (u.email as string) ?? '',
                    phone: (u.phone as string) ?? '',
                    address: (u.address as string) ?? '',
                    city: (u.city as string) ?? '',
                    country: (u.country as string) ?? '',
                    bio: (u.bio as string) ?? '',
                });
            })
            .catch(() => {
                if (!cancelled) setError('Profile not found');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [profileId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profileId || !isOwnProfile) return;
        setSaving(true);
        try {
            const form = new FormData();
            form.append('name', formData.name);
            form.append('email', formData.email);
            if (formData.phone) form.append('phone', formData.phone);
            if (formData.address) form.append('address', formData.address);
            if (formData.city) form.append('city', formData.city);
            if (formData.country) form.append('country', formData.country);
            if (formData.bio) form.append('bio', formData.bio);
            await updateUser(profileId, form);
            setProfile((prev) => (prev ? { ...prev, ...formData } : null));
            setIsEditing(false);
            toast({ title: 'Profile updated' });
        } catch (err: unknown) {
            toast({ variant: 'destructive', title: 'Error', description: (err as Error)?.message ?? 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    if (loading) {
        return (
            <div className="w-full mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center text-muted-foreground">Loading...</div>
            </div>
        );
    }
    if (error || !profile) {
        return (
            <div className="w-full mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-muted-foreground">{error ?? 'Profile not found'}</p>
                </div>
            </div>
        );
    }

    const displayName = profile.name ?? 'User';
    const displayEmail = profile.email ?? '';
    const memberYear = profile.createdAt ? new Date(profile.createdAt).getFullYear() : '';

    return (
        <div className="w-full mx-auto px-4 py-16 transition-all duration-300">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Profile</h1>
                        <p className="text-muted-foreground">{displayEmail || profileId}</p>
                    </div>
                    {isOwnProfile && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(!isEditing)}
                            className="px-6 py-2 border border-primary text-primary rounded-lg hover:bg-accent transition"
                        >
                            {isEditing ? 'Cancel' : 'Edit Profile'}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-card border border-border rounded-lg p-6 text-center">
                            <div className="w-32 h-32 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                                <span className="text-4xl text-primary">👤</span>
                            </div>
                            <h2 className="text-xl font-semibold mb-2">{displayName}</h2>
                            <p className="text-sm text-muted-foreground mb-4">{displayEmail}</p>
                            <div className="space-y-2 text-sm">
                                {memberYear && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Member Since:</span>
                                        <span className="font-medium">{memberYear}</span>
                                    </div>
                                )}
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
                                        disabled={saving}
                                        className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-70"
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-card border border-border rounded-lg p-6">
                                <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                                        <p className="font-medium">{profile.name ?? '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Email</p>
                                        <p className="font-medium">{profile.email ?? '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Phone</p>
                                        <p className="font-medium">{profile.phone ?? '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Address</p>
                                        <p className="font-medium">{profile.address ?? '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Bio</p>
                                        <p className="font-medium">{profile.bio ?? '-'}</p>
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
