'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, Eye, EyeOff, User, Mail, Phone, Lock, Camera, Upload, X, Shield, Building2, CreditCard } from 'lucide-react';
import { getCurrentUser, updateMyProfile, changeMyPassword, uploadMyAvatar } from '@/lib/api/users';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { GalleryPage } from '@/components/dashboard/gallery/GalleryPage';

// Form validation schema
const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    // Banking details
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

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [showPassword, setShowPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Fetch current user data
    const { data: user, isLoading, error } = useQuery({
        queryKey: ['currentUser'],
        queryFn: getCurrentUser,
    });

    // Update profile mutation
    const updateProfileMutation = useMutation({
        mutationFn: (data: FormData) => updateMyProfile(data),
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Profile updated successfully',
            });
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update profile',
                variant: 'destructive',
            });
        },
    });

    // Upload avatar mutation
    const uploadAvatarMutation = useMutation({
        mutationFn: (avatarData: File | string) => uploadMyAvatar(avatarData),
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Avatar updated successfully',
            });
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            setAvatarDialogOpen(false);
            setIsUploadingAvatar(false);
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to upload avatar',
                variant: 'destructive',
            });
            setIsUploadingAvatar(false);
        },
    });

    // Change password mutation
    const changePasswordMutation = useMutation({
        mutationFn: (data: { currentPassword: string; newPassword: string }) =>
            changeMyPassword(data),
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Password changed successfully',
            });
            passwordForm.reset();
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to change password',
                variant: 'destructive',
            });
        },
    });

    // Set form values when user data is loaded
    useEffect(() => {
        if (user) {
            profileForm.reset({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone?.toString() || '',
                bankName: user.sellerInfo?.bankDetails?.bankName || '',
                accountNumber: user.sellerInfo?.bankDetails?.accountNumber || '',
                accountHolderName: user.sellerInfo?.bankDetails?.accountHolderName || '',
                branchCode: user.sellerInfo?.bankDetails?.branchCode || '',
            });
        }
    }, [user, profileForm]);

    const onProfileSubmit = async (data: ProfileFormData) => {
        try {
            const formData = new FormData();
            formData.append('name', data.name);
            formData.append('email', data.email);
            if (data.phone) {
                formData.append('phone', data.phone);
            }
            // Add banking details if provided
            if (data.bankName) {
                formData.append('bankName', data.bankName);
            }
            if (data.accountNumber) {
                formData.append('accountNumber', data.accountNumber);
            }
            if (data.accountHolderName) {
                formData.append('accountHolderName', data.accountHolderName);
            }
            if (data.branchCode) {
                formData.append('branchCode', data.branchCode);
            }
            updateProfileMutation.mutate(formData);
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    };

    const onPasswordSubmit = async (data: PasswordFormData) => {
        changePasswordMutation.mutate({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
        });
    };

    const handleAvatarSelect = (imageUrl: string) => {
        setIsUploadingAvatar(true);
        uploadAvatarMutation.mutate(imageUrl);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsUploadingAvatar(true);
            uploadAvatarMutation.mutate(file);
        }
    };

    const handleRemoveAvatar = () => {
        toast({
            title: 'Info',
            description: 'Avatar removal not implemented yet',
        });
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const formatRole = (role: string) => {
        return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
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
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">
                        <p className="text-destructive">Error loading profile data</p>
                        <Button variant="outline" onClick={() => router.back()} className="mt-4">
                            Go Back
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const sellerInfo = user?.sellerInfo || {};
    const roles = Array.isArray(user?.roles) ? user.roles : [user?.roles].filter(Boolean);
    const hasSellerInfo = sellerInfo.companyName;

    return (
        <div className="space-y-6">
            {/* Hero Section - Avatar and Basic Info */}
            <Card className="border-2">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        {/* Avatar Section */}
                        <div className="relative group">
                            <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                                <AvatarImage src={user?.avatar} alt={user?.name} />
                                <AvatarFallback className="text-2xl font-semibold">
                                    {getInitials(user?.name || 'U')}
                                </AvatarFallback>
                            </Avatar>
                            {isUploadingAvatar && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                            {/* Avatar Overlay on Hover */}
                            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="h-6 w-6 text-white" />
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 space-y-3">
                            <div>
                                <h1 className="text-3xl font-bold">{user?.name || 'Unknown User'}</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-muted-foreground">{user?.email}</p>
                                </div>
                            </div>
                            
                            {/* Roles */}
                            {roles.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {roles.map((role) => (
                                        <Badge key={role} variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                                            <Shield className="h-3.5 w-3.5" />
                                            {formatRole(role)}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Avatar Actions */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" disabled={isUploadingAvatar}>
                                            <Camera className="h-4 w-4 mr-2" />
                                            Choose from Gallery
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-[90%] max-h-[90%] overflow-auto">
                                        <DialogHeader>
                                            <DialogTitle>Select Avatar</DialogTitle>
                                            <DialogDescription>
                                                Choose an image from your gallery
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="mt-4">
                                            <GalleryPage
                                                mode="picker"
                                                onMediaSelect={handleAvatarSelect}
                                                allowMultiple={false}
                                                mediaType="images"
                                                initialTab="images"
                                            />
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingAvatar}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload File
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                {user?.avatar && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleRemoveAvatar}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content - Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Profile Information */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                <CardTitle>Profile Information</CardTitle>
                            </div>
                            <CardDescription>Update your personal information</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...profileForm}>
                                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormField
                                            control={profileForm.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Full Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter your name" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={profileForm.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone Number</FormLabel>
                                                    <FormControl>
                                                        <Input type="tel" placeholder="Enter phone number" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={profileForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Address</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="Enter email address" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Roles - Read Only */}
                                    <FormItem>
                                        <FormLabel>Role</FormLabel>
                                        <FormControl>
                                            <Input
                                                value={roles.map(formatRole).join(', ')}
                                                disabled
                                                className="bg-muted cursor-not-allowed"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Your role cannot be changed. Contact an administrator for role changes.
                                        </FormDescription>
                                    </FormItem>

                                    <div className="flex justify-end pt-4">
                                        <Button type="submit" disabled={updateProfileMutation.isPending} size="lg">
                                            {updateProfileMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>

                    {/* Banking Details */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                <CardTitle>Banking Details</CardTitle>
                            </div>
                            <CardDescription>Update your banking information for payments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...profileForm}>
                                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormField
                                            control={profileForm.control}
                                            name="bankName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Bank Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter bank name" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={profileForm.control}
                                            name="accountNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Account Number</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter account number" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormField
                                            control={profileForm.control}
                                            name="accountHolderName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Account Holder Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter account holder name" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={profileForm.control}
                                            name="branchCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Branch Code</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter branch code" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button type="submit" disabled={updateProfileMutation.isPending} size="lg">
                                            {updateProfileMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Save Banking Details
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>

                    {/* Company Information - Only for Sellers */}
                    {hasSellerInfo && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    <CardTitle>Company Information</CardTitle>
                                </div>
                                <CardDescription>These details cannot be modified</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FormItem>
                                        <FormLabel>Company Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                value={sellerInfo.companyName || ''}
                                                disabled
                                                className="bg-muted cursor-not-allowed"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Company name cannot be changed after registration.
                                        </FormDescription>
                                    </FormItem>

                                    {sellerInfo.companyRegistrationNumber && (
                                        <FormItem>
                                            <FormLabel>Registration Number</FormLabel>
                                            <FormControl>
                                                <Input
                                                    value={sellerInfo.companyRegistrationNumber || ''}
                                                    disabled
                                                    className="bg-muted cursor-not-allowed"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}

                                    {sellerInfo.registrationDate && (
                                        <FormItem>
                                            <FormLabel>Registration Date</FormLabel>
                                            <FormControl>
                                                <Input
                                                    value={sellerInfo.registrationDate || ''}
                                                    disabled
                                                    className="bg-muted cursor-not-allowed"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}

                                    {sellerInfo.taxId && (
                                        <FormItem>
                                            <FormLabel>Tax ID</FormLabel>
                                            <FormControl>
                                                <Input
                                                    value={sellerInfo.taxId || ''}
                                                    disabled
                                                    className="bg-muted cursor-not-allowed"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Security */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Lock className="h-5 w-5" />
                                <CardTitle>Change Password</CardTitle>
                            </div>
                            <CardDescription>Update your password to keep your account secure</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...passwordForm}>
                                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
                                    <FormField
                                        control={passwordForm.control}
                                        name="currentPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Current Password</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type={showCurrentPassword ? 'text' : 'password'}
                                                            placeholder="Enter current password"
                                                            {...field}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute right-0 top-0 h-full px-3"
                                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                        >
                                                            {showCurrentPassword ? (
                                                                <EyeOff className="h-4 w-4" />
                                                            ) : (
                                                                <Eye className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={passwordForm.control}
                                        name="newPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>New Password</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type={showPassword ? 'text' : 'password'}
                                                            placeholder="Enter new password"
                                                            {...field}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute right-0 top-0 h-full px-3"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                        >
                                                            {showPassword ? (
                                                                <EyeOff className="h-4 w-4" />
                                                            ) : (
                                                                <Eye className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={passwordForm.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Confirm Password</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="Confirm new password"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button 
                                        type="submit" 
                                        disabled={changePasswordMutation.isPending} 
                                        className="w-full"
                                        size="lg"
                                    >
                                        {changePasswordMutation.isPending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Changing...
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="mr-2 h-4 w-4" />
                                                Change Password
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
