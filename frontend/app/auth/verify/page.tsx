"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function VerifyPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Redirect to login page with token
    if (typeof window !== 'undefined') {
        const token = searchParams.get('token');
        if (token) {
            router.push(`/auth/login?token=${token}`);
        } else {
            router.push('/auth/login');
        }
    }

    return null;
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <VerifyPageContent />
        </Suspense>
    );
}
