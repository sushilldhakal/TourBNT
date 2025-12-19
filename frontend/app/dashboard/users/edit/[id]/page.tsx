'use client';

import { useState, useEffect } from 'react';
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
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, ArrowLeft, Eye, EyeOff, User, Mail, Phone, Lock, Building2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { getUserById, updateUser } from '@/lib/api/users';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminGuard } from '@/components/dashboard/RoleGuard';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getRoleBadgeColor, UserRole } from '@/lib/utils/roles';

// Form validation schema
const userSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
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

    // Extract and validate the ID
    const userId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : null;

    const [showPassword, setShowPassword] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const form = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            password: '',
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
            const userData = user;
            form.reset({
                name: userData.name || '',
                email: userData.email || '',
                phone: userData.phone?.toString() || '',
                password: '', // Don't populate password
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

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
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

    return (
        <AdminGuard>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Edit User</h1>
                            <p className="text-muted-foreground">Update user information and banking details</p>
                        </div>
                    </div>
                </div>

                {/* User Info Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border">
                                <AvatarImage src={user?.avatar} alt={user?.name} />
                                <AvatarFallback>{getInitials(user?.name || 'U')}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    {user?.name || 'Unknown User'}
                                    {user?.roles && (
                                        <Badge variant={getRoleBadgeColor(user.roles as UserRole) as any}>
                                            {user.roles}
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>{user?.email}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Basic Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Basic Information
                                </CardTitle>
                                <CardDescription>Update user's basic profile information</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter user name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="Enter email address" {...field} />
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
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input type="tel" placeholder="Enter phone number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

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
                                                        className="absolute right-0 top-0 h-full"
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
                            </CardContent>
                        </Card>

                        {/* Banking Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Banking Details
                                </CardTitle>
                                <CardDescription>Update user's banking information</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateUserMutation.isPending}>
                                {updateUserMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
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
            </div>
        </AdminGuard>
    );
}
