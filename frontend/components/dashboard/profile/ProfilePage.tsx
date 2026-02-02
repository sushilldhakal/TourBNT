/**
 * ProfilePage Component
 *
 * Main profile page for managing account information.
 * Matches the design pattern of SettingsPage (DashboardCardHeader, sidebar layout).
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useCacheManager, useCurrentUserProfile } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, Eye, EyeOff, User, Mail, Lock, Camera, X, Shield, Building2, CreditCard, CheckCircle2 } from 'lucide-react';
import { updateMyProfile, changeMyPassword, uploadMyAvatar } from '@/lib/api/users';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Gallery } from '@/components/dashboard/gallery/Gallery';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import type { ProfileFormData, PasswordFormData } from '@/types/app';
import type { User as UserType } from '@/types/types';

/** Shape of seller info (User.sellerInfo is Record<string, unknown>) */
type SellerInfoShape = {
    companyName?: string;
    companyRegistrationNumber?: string;
    registrationDate?: string;
    taxId?: string;
};

const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    accountHolderName: z.string().optional(),
    branchCode: z.string().optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export function ProfilePage() {
    const router = useRouter();
    const { invalidateCurrentUser } = useCacheManager();
    const [showPassword, setShowPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    const profileForm = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            bankName: '',
            accountNumber: '',
            accountHolderName: '',
            branchCode: '',
        },
    });

    const passwordForm = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const { data, isLoading, error } = useCurrentUserProfile();
    const user = (data ?? {}) as Partial<UserType>;

    const updateProfileMutation = useMutation({
        mutationFn: (data: FormData) => updateMyProfile(data),
        onSuccess: () => {
            toast({ title: 'Success', description: 'Profile updated successfully' });
            invalidateCurrentUser();
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message || 'Failed to update profile', variant: 'destructive' });
        },
    });

    const uploadAvatarMutation = useMutation({
        mutationFn: (avatarData: File | string) => uploadMyAvatar(avatarData),
        onSuccess: () => {
            toast({ title: 'Success', description: 'Avatar updated successfully' });
            invalidateCurrentUser();
            setAvatarDialogOpen(false);
            setIsUploadingAvatar(false);
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message || 'Failed to upload avatar', variant: 'destructive' });
            setIsUploadingAvatar(false);
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: (data: { currentPassword: string; newPassword: string }) => changeMyPassword(data),
        onSuccess: () => {
            toast({ title: 'Success', description: 'Password changed successfully' });
            passwordForm.reset();
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message || 'Failed to change password', variant: 'destructive' });
        },
    });

    useEffect(() => {
        const uid = (user as UserType)?._id ?? (user as { id?: string })?.id;
        if (!uid) return;
        const bankDetails = (user?.sellerInfo as { bankDetails?: { bankName?: string; accountNumber?: string; accountHolderName?: string; branchCode?: string } })?.bankDetails;
        const u = user as UserType & { phone?: string | number };
        profileForm.reset({
            name: u?.name || '',
            email: u?.email || '',
            phone: u?.phone?.toString() || '',
            bankName: bankDetails?.bankName || '',
            accountNumber: bankDetails?.accountNumber || '',
            accountHolderName: bankDetails?.accountHolderName || '',
            branchCode: bankDetails?.branchCode || '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [(user as UserType)?._id ?? (user as { id?: string })?.id]);

    const onProfileSubmit = async (data: ProfileFormData) => {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('email', data.email);
        if (data.phone) formData.append('phone', data.phone);
        if (data.bankName) formData.append('bankName', data.bankName);
        if (data.accountNumber) formData.append('accountNumber', data.accountNumber);
        if (data.accountHolderName) formData.append('accountHolderName', data.accountHolderName);
        if (data.branchCode) formData.append('branchCode', data.branchCode);
        updateProfileMutation.mutate(formData);
    };

    const onPasswordSubmit = async (data: PasswordFormData) => {
        changePasswordMutation.mutate({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
        });
    };

    const handleAvatarSelect = (mediaUrl: string | string[]) => {
        const url = Array.isArray(mediaUrl) ? mediaUrl[0] : mediaUrl;
        if (url) {
            setIsUploadingAvatar(true);
            uploadAvatarMutation.mutate(url);
        }
    };

    const handleRemoveAvatar = () => {
        toast({ title: 'Info', description: 'Avatar removal not implemented yet' });
    };

    const getInitials = (name: string) =>
        name.split(' ').map((part) => part[0]).join('').toUpperCase().substring(0, 2);

    const formatRole = (role: string) => role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

    const containerClass = 'container mx-auto py-8 px-4 max-w-6xl';

    if (isLoading) {
        return (
            <div className={containerClass}>
                <DashboardCardHeader variant="compact" icon={User} badge="Profile" title="Profile" description="Manage your account" />
                <Card className="mt-6">
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className={containerClass}>
                <DashboardCardHeader variant="compact" icon={User} badge="Profile" title="Profile" description="Manage your account" />
                <Card className="mt-6">
                    <CardContent className="p-6">
                        <div className="text-center">
                            <p className="text-destructive">Error loading profile data</p>
                            <Button variant="outline" onClick={() => router.back()} className="mt-4">Go Back</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const sellerInfo: SellerInfoShape = (user?.sellerInfo || {}) as SellerInfoShape;
    const roles: string[] = Array.isArray(user?.roles) ? [...(user.roles as string[])] : (user?.roles ? [String(user.roles)] : []);
    const hasSellerInfo = Boolean(sellerInfo.companyName);

    return (
        <div className={containerClass}>
            <DashboardCardHeader
                variant="compact"
                icon={User}
                badge="Profile"
                title="Profile"
                description="Manage your account and preferences"
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">
                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Tab Navigation */}
                        <Card>
                            <CardContent className="p-4">
                                <TabsList className="flex flex-col h-auto bg-transparent space-y-1">
                                    <TabsTrigger value="profile" className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                        <User className="h-4 w-4" />
                                        <span>Profile</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="banking" className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                        <CreditCard className="h-4 w-4" />
                                        <span>Banking</span>
                                    </TabsTrigger>
                                    {hasSellerInfo && (
                                        <TabsTrigger value="company" className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                            <Building2 className="h-4 w-4" />
                                            <span>Company</span>
                                            <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />
                                        </TabsTrigger>
                                    )}
                                    <TabsTrigger value="security" className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                        <Lock className="h-4 w-4" />
                                        <span>Security</span>
                                    </TabsTrigger>
                                </TabsList>
                            </CardContent>
                        </Card>

                        {/* Account Info Card */}
                        <Card className="pt-0">
                            <CardHeader className="pb-3 pt-4 rounded-t-xl">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    Account
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                <p className="mb-2">
                                    Your profile data is used to personalize your experience and process bookings.
                                </p>
                                <p>
                                    Banking details are encrypted and used only for seller payouts.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="space-y-6">
                        <TabsContent value="profile" className="mt-0 space-y-6">
                            {/* Avatar & Email Section */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                                        <div className="relative shrink-0">
                                            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                                                <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name} />
                                                <AvatarFallback className="text-xl font-semibold">{getInitials(user?.name || 'U')}</AvatarFallback>
                                            </Avatar>
                                            {isUploadingAvatar && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-full">
                                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-center sm:text-left space-y-2">
                                            <div>
                                                <h2 className="text-xl font-bold">{user?.name || 'Unknown User'}</h2>
                                                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <p className="text-muted-foreground text-sm">{user?.email}</p>
                                                </div>
                                            </div>
                                            {roles.length > 0 && (
                                                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                                    {roles.map((role) => (
                                                        <Badge key={role} variant="secondary" className="flex items-center gap-1.5 px-2.5 py-0.5">
                                                            <Shield className="h-3 w-3" />
                                                            {formatRole(role)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                                                <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" disabled={isUploadingAvatar}>
                                                            <Camera className="h-4 w-4 mr-2" />
                                                            Change Avatar
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="!max-w-[90%] max-h-[90%] overflow-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Select Avatar</DialogTitle>
                                                            <DialogDescription>Choose an image from your gallery</DialogDescription>
                                                        </DialogHeader>
                                                        <div className="mt-4">
                                                            <Gallery
                                                                mode="picker"
                                                                onMediaSelect={handleAvatarSelect}
                                                                allowMultiple={false}
                                                                initialTab="images"
                                                            />
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                                {user?.avatar && (
                                                    <Button variant="ghost" size="sm" onClick={handleRemoveAvatar} className="text-destructive hover:text-destructive">
                                                        <X className="h-4 w-4 mr-2" />
                                                        Remove
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Profile Information</CardTitle>
                                    <CardDescription>Update your personal information</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Form {...profileForm}>
                                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <FormField control={profileForm.control} name="name" render={({ field }) => (
                                                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Enter your name" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                                <FormField control={profileForm.control} name="phone" render={({ field }) => (
                                                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="Enter phone number" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </div>
                                            <FormField control={profileForm.control} name="email" render={({ field }) => (
                                                <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="Enter email address" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormItem>
                                                <FormLabel>Role</FormLabel>
                                                <FormControl>
                                                    <Input value={roles.map(formatRole).join(', ')} disabled className="bg-muted cursor-not-allowed" />
                                                </FormControl>
                                                <FormDescription>Your role cannot be changed. Contact an administrator for role changes.</FormDescription>
                                            </FormItem>
                                            <div className="flex justify-end pt-4">
                                                <Button type="submit" disabled={updateProfileMutation.isPending} size="lg">
                                                    {updateProfileMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="banking" className="mt-0 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Banking Details</CardTitle>
                                    <CardDescription>Update your banking information for payments</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Form {...profileForm}>
                                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <FormField control={profileForm.control} name="bankName" render={({ field }) => (
                                                    <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="Enter bank name" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                                <FormField control={profileForm.control} name="accountNumber" render={({ field }) => (
                                                    <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="Enter account number" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <FormField control={profileForm.control} name="accountHolderName" render={({ field }) => (
                                                    <FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="Enter account holder name" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                                <FormField control={profileForm.control} name="branchCode" render={({ field }) => (
                                                    <FormItem><FormLabel>Branch Code</FormLabel><FormControl><Input placeholder="Enter branch code" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </div>
                                            <div className="flex justify-end pt-4">
                                                <Button type="submit" disabled={updateProfileMutation.isPending} size="lg">
                                                    {updateProfileMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Banking Details</>}
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {hasSellerInfo && (
                            <TabsContent value="company" className="mt-0 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Company Information</CardTitle>
                                        <CardDescription>These details cannot be modified</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <FormItem>
                                                <FormLabel>Company Name</FormLabel>
                                                <FormControl>
                                                    <Input value={sellerInfo.companyName || ''} disabled className="bg-muted cursor-not-allowed" />
                                                </FormControl>
                                                <FormDescription>Company name cannot be changed after registration.</FormDescription>
                                            </FormItem>
                                            {sellerInfo.companyRegistrationNumber && (
                                                <FormItem>
                                                    <FormLabel>Registration Number</FormLabel>
                                                    <FormControl>
                                                        <Input value={sellerInfo.companyRegistrationNumber || ''} disabled className="bg-muted cursor-not-allowed" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                            {sellerInfo.registrationDate && (
                                                <FormItem>
                                                    <FormLabel>Registration Date</FormLabel>
                                                    <FormControl>
                                                        <Input value={sellerInfo.registrationDate || ''} disabled className="bg-muted cursor-not-allowed" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                            {sellerInfo.taxId && (
                                                <FormItem>
                                                    <FormLabel>Tax ID</FormLabel>
                                                    <FormControl>
                                                        <Input value={sellerInfo.taxId || ''} disabled className="bg-muted cursor-not-allowed" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}

                        <TabsContent value="security" className="mt-0 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Change Password</CardTitle>
                                    <CardDescription>Update your password to keep your account secure</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Form {...passwordForm}>
                                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
                                            <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Current Password</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input type={showCurrentPassword ? 'text' : 'password'} placeholder="Enter current password" {...field} />
                                                            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>New Password</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input type={showPassword ? 'text' : 'password'} placeholder="Enter new password" {...field} />
                                                            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Confirm Password</FormLabel>
                                                    <FormControl><Input type={showPassword ? 'text' : 'password'} placeholder="Confirm new password" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="submit" disabled={changePasswordMutation.isPending} className="w-full" size="lg">
                                                {changePasswordMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Changing...</> : <><Lock className="mr-2 h-4 w-4" />Change Password</>}
                                            </Button>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}
