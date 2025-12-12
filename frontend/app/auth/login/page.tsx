"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin, useRegister, useVerifyEmail, useForgotPassword, useResetPassword } from "@/lib/hooks/useAuth";
import useTokenStore from "@/lib/store/tokenStore";
import { canAccessDashboard } from "@/lib/utils/roles";
import { jwtDecode } from "jwt-decode";
import { Mail, Lock, User, Phone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const setToken = useTokenStore((state) => state.setToken);

    const [showForm, setShowForm] = useState<'login' | 'signup' | 'forgot' | 'verify'>('login');
    const [keepMeSignedIn, setKeepMeSignedIn] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Check for form parameter in URL
    useEffect(() => {
        const form = searchParams.get('form');
        if (form === 'signup') setShowForm('signup');
        if (form === 'forgot') setShowForm('forgot');
    }, [searchParams]);

    // Refs
    const loginEmailRef = useRef<HTMLInputElement>(null);
    const loginPasswordRef = useRef<HTMLInputElement>(null);
    const registerEmailRef = useRef<HTMLInputElement>(null);
    const registerPasswordRef = useRef<HTMLInputElement>(null);
    const registerNameRef = useRef<HTMLInputElement>(null);
    const registerPhoneRef = useRef<HTMLInputElement>(null);
    const forgotEmailRef = useRef<HTMLInputElement>(null);
    const resetPasswordRef = useRef<HTMLInputElement>(null);

    // Mutations
    const loginMutation = useLogin();
    const registerMutation = useRegister();
    const verifyMutation = useVerifyEmail();
    const forgotPasswordMutation = useForgotPassword();
    const resetPasswordMutation = useResetPassword();

    useEffect(() => {
        const token = searchParams.get('token');
        const forgotToken = searchParams.get('forgottoken');

        if (token) {
            verifyMutation.mutate({ token }, {
                onSuccess: () => {
                    toast({
                        title: 'Email Verified',
                        description: 'Your email has been verified. Please login.',
                    });
                    setShowForm('login');
                },
                onError: (error: any) => {
                    toast({
                        title: 'Verification Failed',
                        description: error.message,
                        variant: 'destructive',
                    });
                },
            });
        }

        if (forgotToken) {
            setShowForm('forgot');
        }
    }, [searchParams]);


    const handleLogin = () => {
        const email = loginEmailRef.current?.value.trim() || '';
        const password = loginPasswordRef.current?.value.trim() || '';

        const newErrors: { [key: string]: string } = {};
        if (!email) newErrors.loginEmail = 'Email is required';
        if (!password) newErrors.loginPassword = 'Password is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        loginMutation.mutate(
            { email, password, keepMeSignedIn },
            {
                onSuccess: (response) => {
                    setToken(response.accessToken);
                    const decoded = jwtDecode(response.accessToken) as { roles?: string };

                    toast({
                        title: 'Login Successful',
                        description: 'Welcome back!',
                    });

                    // Check if user can access dashboard using centralized utility
                    if (canAccessDashboard(decoded.roles ?? null)) {
                        // Use window.location for cross-app navigation to dashboard
                        window.location.href = '/dashboard';
                    } else {
                        // Regular users go to home page
                        router.push('/');
                    }
                },
                onError: (error: any) => {
                    toast({
                        title: 'Login Failed',
                        description: error.message || 'Invalid credentials',
                        variant: 'destructive',
                    });
                },
            }
        );
    };

    const handleRegister = () => {
        const email = registerEmailRef.current?.value.trim() || '';
        const password = registerPasswordRef.current?.value.trim() || '';
        const name = registerNameRef.current?.value.trim() || '';
        const phone = registerPhoneRef.current?.value.trim() || '';

        const newErrors: { [key: string]: string } = {};
        if (!email) newErrors.registerEmail = 'Email is required';
        if (!password) newErrors.registerPassword = 'Password is required';
        if (!name) newErrors.registerName = 'Name is required';
        if (!phone) newErrors.registerPhone = 'Phone is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        registerMutation.mutate(
            { name, email, password, phone },
            {
                onSuccess: () => {
                    toast({
                        title: 'Registration Successful',
                        description: 'Please check your email to verify your account.',
                    });
                    setShowForm('verify');
                },
                onError: (error: any) => {
                    toast({
                        title: 'Registration Failed',
                        description: error.message,
                        variant: 'destructive',
                    });
                },
            }
        );
    };


    const handleForgotPassword = () => {
        const email = forgotEmailRef.current?.value.trim() || '';

        if (!email) {
            setErrors({ forgotEmail: 'Email is required' });
            return;
        }

        forgotPasswordMutation.mutate(
            { email },
            {
                onSuccess: () => {
                    toast({
                        title: 'Email Sent',
                        description: 'Please check your email for reset instructions.',
                    });
                },
                onError: (error: any) => {
                    toast({
                        title: 'Error',
                        description: error.message,
                        variant: 'destructive',
                    });
                },
            }
        );
    };

    const handleResetPassword = () => {
        const password = resetPasswordRef.current?.value.trim() || '';
        const token = searchParams.get('forgottoken') || '';

        if (!password) {
            setErrors({ resetPassword: 'Password is required' });
            return;
        }

        resetPasswordMutation.mutate(
            { token, password },
            {
                onSuccess: () => {
                    toast({
                        title: 'Password Reset',
                        description: 'Your password has been reset successfully.',
                    });
                    router.push('/auth/login');
                },
                onError: (error: any) => {
                    toast({
                        title: 'Error',
                        description: error.message,
                        variant: 'destructive',
                    });
                },
            }
        );
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 p-4">
            <div className="w-full max-w-md">
                {showForm === 'login' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Welcome Back</CardTitle>
                            <CardDescription>Sign in to your account</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loginMutation.isError && (
                                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                                    <AlertCircle size={16} />
                                    <p className="text-sm">Invalid email or password</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        className="pl-10"
                                        ref={loginEmailRef}
                                    />
                                </div>
                                {errors.loginEmail && <p className="text-sm text-destructive">{errors.loginEmail}</p>}
                            </div>


                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10"
                                        ref={loginPasswordRef}
                                    />
                                </div>
                                {errors.loginPassword && <p className="text-sm text-destructive">{errors.loginPassword}</p>}
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="keep-signed-in"
                                        checked={keepMeSignedIn}
                                        onCheckedChange={setKeepMeSignedIn}
                                    />
                                    <Label htmlFor="keep-signed-in" className="text-sm">Keep me signed in</Label>
                                </div>
                                <Button
                                    variant="link"
                                    className="p-0 h-auto"
                                    onClick={() => setShowForm('forgot')}
                                >
                                    Forgot password?
                                </Button>
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleLogin}
                                disabled={loginMutation.isPending}
                            >
                                {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign In
                            </Button>

                            <div className="text-center text-sm">
                                Don't have an account?{' '}
                                <Button
                                    variant="link"
                                    className="p-0 h-auto"
                                    onClick={() => setShowForm('signup')}
                                >
                                    Sign up
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {showForm === 'signup' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Create Account</CardTitle>
                            <CardDescription>Sign up for a new account</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="John Doe"
                                        className="pl-10"
                                        ref={registerNameRef}
                                    />
                                </div>
                                {errors.registerName && <p className="text-sm text-destructive">{errors.registerName}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="register-email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="register-email"
                                        type="email"
                                        placeholder="your@email.com"
                                        className="pl-10"
                                        ref={registerEmailRef}
                                    />
                                </div>
                                {errors.registerEmail && <p className="text-sm text-destructive">{errors.registerEmail}</p>}
                            </div>


                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+1 (555) 000-0000"
                                        className="pl-10"
                                        ref={registerPhoneRef}
                                    />
                                </div>
                                {errors.registerPhone && <p className="text-sm text-destructive">{errors.registerPhone}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="register-password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="register-password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10"
                                        ref={registerPasswordRef}
                                    />
                                </div>
                                {errors.registerPassword && <p className="text-sm text-destructive">{errors.registerPassword}</p>}
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleRegister}
                                disabled={registerMutation.isPending}
                            >
                                {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Account
                            </Button>

                            <div className="text-center text-sm">
                                Already have an account?{' '}
                                <Button
                                    variant="link"
                                    className="p-0 h-auto"
                                    onClick={() => setShowForm('login')}
                                >
                                    Sign in
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {showForm === 'forgot' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Reset Password</CardTitle>
                            <CardDescription>
                                {searchParams.get('forgottoken')
                                    ? 'Enter your new password'
                                    : 'Enter your email to receive reset instructions'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {forgotPasswordMutation.isSuccess && !searchParams.get('forgottoken') && (
                                <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-md">
                                    <CheckCircle2 size={16} />
                                    <p className="text-sm">Check your email for reset instructions</p>
                                </div>
                            )}

                            {searchParams.get('forgottoken') ? (
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="new-password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="pl-10"
                                            ref={resetPasswordRef}
                                        />
                                    </div>
                                    {errors.resetPassword && <p className="text-sm text-destructive">{errors.resetPassword}</p>}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="forgot-email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="forgot-email"
                                            type="email"
                                            placeholder="your@email.com"
                                            className="pl-10"
                                            ref={forgotEmailRef}
                                        />
                                    </div>
                                    {errors.forgotEmail && <p className="text-sm text-destructive">{errors.forgotEmail}</p>}
                                </div>
                            )}

                            <Button
                                className="w-full"
                                onClick={searchParams.get('forgottoken') ? handleResetPassword : handleForgotPassword}
                                disabled={forgotPasswordMutation.isPending || resetPasswordMutation.isPending}
                            >
                                {(forgotPasswordMutation.isPending || resetPasswordMutation.isPending) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {searchParams.get('forgottoken') ? 'Reset Password' : 'Send Reset Link'}
                            </Button>

                            <div className="text-center text-sm">
                                <Button
                                    variant="link"
                                    className="p-0 h-auto"
                                    onClick={() => setShowForm('login')}
                                >
                                    Back to login
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {showForm === 'verify' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Check Your Email</CardTitle>
                            <CardDescription>We've sent you a verification link</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
                                <p className="text-sm text-muted-foreground mb-4">
                                    Please check your email and click the verification link to activate your account.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowForm('login')}
                                >
                                    Back to Login
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <LoginPageContent />
        </Suspense>
    );
}
