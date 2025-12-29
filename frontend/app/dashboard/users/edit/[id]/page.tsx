'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, ArrowLeft, Eye, EyeOff, User, Mail, Phone, Lock, Building2, CreditCard, Camera, Upload, X, Shield } from 'lucide-react';
import Link from 'next/link';
import { getUserById, updateUser, uploadMyAvatar } from '@/lib/api/users';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminGuard } from '@/components/dashboard/RoleGuard';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getRoleBadgeColor, UserRole, isAdmin } from '@/lib/utils/roles';
import { useAuth } from '@/lib/hooks/useAuth';
import { GalleryPage } from '@/components/dashboard/gallery/GalleryPage';

// Form validation schema
const userSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
    roles: z.string().optional(),
    // Banking details
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    accountHolderName: z.string().optional(),
    branchCode: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function EditUserPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const params = useParams();
    const { user: currentUser } = useAuth();

    // Extract and validate the ID
    const userId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : null;

    const [showPassword, setShowPassword] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if current user is admin
    const isCurrentUserAdmin = isAdmin(currentUser?.roles);

    const form = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            password: '',
            roles: '',
            bankName: '',
            accountNumber: '',
            accountHolderName: '',
            branchCode: '',
        },
        mode: 'onSubmit',
    });

    // Fetch user data
    const { data: user, isLoading, error } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => {
            if (!userId) {
                throw new Error('User ID is required');
            }
            return getUserById(userId);
        },
        enabled: !!userId && userId !== ':id' && !userId.startsWith(':'), // Prevent calling with literal :id
    });

    // Upload avatar mutation
    const uploadAvatarMutation = useMutation({
        mutationFn: (avatarData: File | string) => uploadMyAvatar(avatarData),
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Avatar updated successfully',
            });
            queryClient.invalidateQueries({ queryKey: ['user', userId] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
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

    // Update user mutation
    const updateUserMutation = useMutation({
        mutationFn: (data: FormData) => {
            if (!userId) {
                throw new Error('User ID is required');
            }
            return updateUser(userId, data);
        },
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'User updated successfully',
            });
            queryClient.invalidateQueries({ queryKey: ['user', userId] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update user',
                variant: 'destructive',
            });
        },
    });

    // Set form values when user data is loaded
    useEffect(() => {
        if (user) {
            const userData = user as any;
            form.reset({
                name: userData.name || '',
                email: userData.email || '',
                phone: userData.phone?.toString() || '',
                password: '', // Don't populate password
                roles: userData.roles || '',
                bankName: userData.sellerInfo?.bankDetails?.bankName || '',
                accountNumber: userData.sellerInfo?.bankDetails?.accountNumber || '',
                accountHolderName: userData.sellerInfo?.bankDetails?.accountHolderName || '',
                branchCode: userData.sellerInfo?.bankDetails?.branchCode || '',
            });
        }
    }, [user, form]);

    const onSubmit = async (data: UserFormData) => {
        if (!userId) {
            toast({
                title: 'Error',
                description: 'User ID is required',
                variant: 'destructive',
            });
            return;
        }

        try {
            const formData = new FormData();

            // Basic info
            formData.append('name', data.name);
            formData.append('email', data.email);
            if (data.phone) {
                formData.append('phone', data.phone);
            }

            // Password (only if provided)
            if (data.password && data.password.length > 0) {
                formData.append('password', data.password);
                setIsUpdatingPassword(true);
            }

            // Role (only if admin and provided)
            if (isCurrentUserAdmin && data.roles) {
                formData.append('roles', data.roles);
            }

            // Banking details (only if provided)
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

            updateUserMutation.mutate(formData);
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    };

    const handleAvatarSelect = (mediaUrl: string | string[]) => {
        const imageUrl = Array.isArray(mediaUrl) ? mediaUrl[0] : mediaUrl;
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

    // Show error if userId is invalid
    if (!userId || userId === ':id' || userId.startsWith(':')) {
        return (
            <AdminGuard>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center">
                            <p className="text-destructive">Invalid user ID</p>
                            <Button variant="outline" onClick={() => router.back()} className="mt-4">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Go Back
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </AdminGuard>
        );
    }

    if (isLoading) {
        return (
            <AdminGuard>
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
            </AdminGuard>
        );
    }

    if (error) {
        return (
            <AdminGuard>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center">
                            <p className="text-destructive">Error loading user data</p>
                            <Button variant="outline" onClick={() => router.back()} className="mt-4">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Go Back
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </AdminGuard>
        );
    }

    const userData = user as any;
    const sellerInfo = userData?.sellerInfo || {};
    const roles = Array.isArray(userData?.roles) ? userData.roles : [userData?.roles].filter(Boolean);
    const hasSellerInfo = sellerInfo.companyName;

    return (
        <AdminGuard>
            <div className="space-y-6">
                {/* Hero Section - Avatar and Basic Info */}
                <Card className="border-2">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            {/* Avatar Section */}
                            <div className="relative group">
                                <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                                    <AvatarImage src={userData?.avatar} alt={userData?.name} />
                                    <AvatarFallback className="text-2xl font-semibold">
                                        {getInitials(userData?.name || 'U')}
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
                                <div className="flex items-center gap-4">
                                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <div>
                                        <h1 className="text-3xl font-bold">{userData?.name || 'Unknown User'}</h1>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-muted-foreground">{userData?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Roles */}
                                {roles.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {roles.map((role: string) => (
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
                                    {userData?.avatar && (
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
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {/* Basic Information */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <User className="h-5 w-5" />
                                            <CardTitle>Profile Information</CardTitle>
                                        </div>
                                        <CardDescription>Update user's personal information</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Full Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter user name" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
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
                                            control={form.control}
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

                                        {/* Role Management - Admin Only */}
                                        <FormField
                                            control={form.control}
                                            name="roles"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Role</FormLabel>
                                                    <FormControl>
                                                        {isCurrentUserAdmin ? (
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select a role" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value={UserRole.ADMIN}>Administrator</SelectItem>
                                                                    <SelectItem value={UserRole.SELLER}>Seller</SelectItem>
                                                                    <SelectItem value={UserRole.ADVERTISER}>Advertiser</SelectItem>
                                                                    <SelectItem value={UserRole.GUIDE}>Guide</SelectItem>
                                                                    <SelectItem value={UserRole.VENUE}>Venue Manager</SelectItem>
                                                                    <SelectItem value={UserRole.USER}>User</SelectItem>
                                                                    <SelectItem value={UserRole.SUBSCRIBER}>Subscriber</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <Input
                                                                value={formatRole(field.value || '')}
                                                                disabled
                                                                className="bg-muted cursor-not-allowed"
                                                            />
                                                        )}
                                                    </FormControl>
                                                    <FormDescription>
                                                        {isCurrentUserAdmin
                                                            ? "Select the user's role. This determines their access permissions."
                                                            : "Only administrators can change user roles."
                                                        }
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="flex justify-end pt-4">
                                            <Button type="submit" disabled={updateUserMutation.isPending} size="lg">
                                                {updateUserMutation.isPending ? (
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
                                    </CardContent>
                                </Card>

                                {/* Banking Details */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" />
                                            <CardTitle>Banking Details</CardTitle>
                                        </div>
                                        <CardDescription>Update user's banking information for payments</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <FormField
                                                control={form.control}
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
                                                control={form.control}
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
                                                control={form.control}
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
                                                control={form.control}
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
                                            <Button type="submit" disabled={updateUserMutation.isPending} size="lg">
                                                {updateUserMutation.isPending ? (
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
                            </form>
                        </Form>
                    </div>

                    {/* Right Column - Security */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Lock className="h-5 w-5" />
                                    <CardTitle>Change Password</CardTitle>
                                </div>
                                <CardDescription>Update user's password to keep their account secure</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                        <FormField
                                            control={form.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>New Password</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input
                                                                type={showPassword ? 'text' : 'password'}
                                                                placeholder="Leave empty to keep current password"
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
                                                    <FormDescription>
                                                        Leave empty if you don't want to change the password
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <Button
                                            type="submit"
                                            disabled={updateUserMutation.isPending}
                                            className="w-full"
                                            size="lg"
                                        >
                                            {updateUserMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <Lock className="mr-2 h-4 w-4" />
                                                    Update Password
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="flex flex-col gap-4">
                            <Button variant="outline" onClick={() => router.back()} size="lg" className="w-full">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Users
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </AdminGuard>
    );
}