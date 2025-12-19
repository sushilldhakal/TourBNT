"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginUser } from "@/lib/api/users";
import { api } from "@/lib/api/apiClient";
import { canAccessDashboard } from "@/lib/utils/roles";
import { Mail, Lock, User, Phone, CheckCircle2, AlertCircle, Loader2, EyeIcon, EyeOffIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Separate show/hide states for different password fields
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    const registerConfirmPasswordRef = useRef<HTMLInputElement>(null);
    const registerNameRef = useRef<HTMLInputElement>(null);
    const registerPhoneRef = useRef<HTMLInputElement>(null);
    const forgotEmailRef = useRef<HTMLInputElement>(null);
    const resetPasswordRef = useRef<HTMLInputElement>(null);

    // Loading states
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    useEffect(() => {
        const token = searchParams.get('token');
        const forgotToken = searchParams.get('forgottoken');

        if (token) {
            // Verify email
            api.post('/api/users/verify-email', { token })
                .then(() => {
                    toast({
                        title: 'Email Verified',
                        description: 'Your email has been verified. Please login.',
                    });
                    setShowForm('login');
                })
                .catch((error: any) => {
                    toast({
                        title: 'Verification Failed',
                        description: error.response?.data?.message || 'Verification failed',
                        variant: 'destructive',
                    });
                });
        }

        if (forgotToken) {
            setShowForm('forgot');
        }
    }, [searchParams, toast]);


    const handleLogin = async () => {
        const email = loginEmailRef.current?.value.trim() || '';
        const password = loginPasswordRef.current?.value.trim() || '';

        const newErrors: { [key: string]: string } = {};
        if (!email) newErrors.loginEmail = 'Email is required';
        if (!password) newErrors.loginPassword = 'Password is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoggingIn(true);
        try {
            // Login - server sets httpOnly cookie and returns user data
            const user = await loginUser({ email, password, keepMeSignedIn });

            toast({
                title: 'Login Successful',
                description: 'Welcome back!',
            });

            // Check if user can access dashboard
            if (canAccessDashboard(user.roles)) {
                router.push('/dashboard');
            } else {
                router.push('/');
            }
        } catch (error: any) {
            toast({
                title: 'Login Failed',
                description: error.response?.data?.message || 'Invalid credentials',
                variant: 'destructive',
            });
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleRegister = async () => {
        const email = registerEmailRef.current?.value.trim() || '';
        const password = registerPasswordRef.current?.value.trim() || '';
        const confirmPassword = registerConfirmPasswordRef.current?.value.trim() || '';
        const name = registerNameRef.current?.value.trim() || '';
        const phone = registerPhoneRef.current?.value.trim() || '';

        const newErrors: { [key: string]: string } = {};
        if (!email) newErrors.registerEmail = 'Email is required';
        if (!password) newErrors.registerPassword = 'Password is required';
        if (!confirmPassword) newErrors.registerConfirmPassword = 'Please confirm your password';
        if (password && confirmPassword && password !== confirmPassword) {
            newErrors.registerConfirmPassword = 'Passwords do not match';
        }
        if (!name) newErrors.registerName = 'Name is required';
        if (!phone) newErrors.registerPhone = 'Phone is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsRegistering(true);
        try {
            await api.post('/api/users/register', { name, email, password, phone });
            toast({
                title: 'Registration Successful',
                description: 'Please check your email to verify your account.',
            });
            setShowForm('verify');
        } catch (error: any) {
            toast({
                title: 'Registration Failed',
                description: error.response?.data?.message || 'Registration failed',
                variant: 'destructive',
            });
        } finally {
            setIsRegistering(false);
        }
    };


    const handleForgotPassword = async () => {
        const email = forgotEmailRef.current?.value.trim() || '';

        if (!email) {
            setErrors({ forgotEmail: 'Email is required' });
            return;
        }

        setIsSendingReset(true);
        try {
            await api.post('/api/users/forgot-password', { email });
            toast({
                title: 'Email Sent',
                description: 'Please check your email for reset instructions.',
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to send reset email',
                variant: 'destructive',
            });
        } finally {
            setIsSendingReset(false);
        }
    };

    const handleResetPassword = async () => {
        const password = resetPasswordRef.current?.value.trim() || '';
        const token = searchParams.get('forgottoken') || '';

        if (!password) {
            setErrors({ resetPassword: 'Password is required' });
            return;
        }

        setIsResettingPassword(true);
        try {
            await api.post('/api/users/reset-password', { token, password });
            toast({
                title: 'Password Reset',
                description: 'Your password has been reset successfully.',
            });
            router.push('/auth/login');
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to reset password',
                variant: 'destructive',
            });
        } finally {
            setIsResettingPassword(false);
        }
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
                                        type={showLoginPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        className={cn('hide-password-toggle px-10')}
                                        ref={loginPasswordRef}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowLoginPassword((prev) => !prev)}
                                    >
                                        {showLoginPassword ? (
                                            <EyeIcon className="h-4 w-4" aria-hidden="true" />
                                        ) : (
                                            <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
                                        )}
                                        <span className="sr-only">{showLoginPassword ? 'Hide password' : 'Show password'}</span>
                                    </Button>
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
                                disabled={isLoggingIn}
                            >
                                {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                                        type={showRegisterPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        className="px-10"
                                        ref={registerPasswordRef}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowRegisterPassword((prev) => !prev)}
                                    >
                                        {showRegisterPassword ? (
                                            <EyeIcon className="h-4 w-4" aria-hidden="true" />
                                        ) : (
                                            <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
                                        )}
                                        <span className="sr-only">{showRegisterPassword ? 'Hide password' : 'Show password'}</span>
                                    </Button>
                                </div>
                                {errors.registerPassword && <p className="text-sm text-destructive">{errors.registerPassword}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirm-password"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        className="px-10"
                                        ref={registerConfirmPasswordRef}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeIcon className="h-4 w-4" aria-hidden="true" />
                                        ) : (
                                            <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
                                        )}
                                        <span className="sr-only">{showConfirmPassword ? 'Hide password' : 'Show password'}</span>
                                    </Button>
                                </div>
                                {errors.registerConfirmPassword && <p className="text-sm text-destructive">{errors.registerConfirmPassword}</p>}
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleRegister}
                                disabled={isRegistering}
                            >
                                {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                                disabled={isSendingReset || isResettingPassword}
                            >
                                {(isSendingReset || isResettingPassword) && (
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
