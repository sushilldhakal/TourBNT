"use client";

import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
    const router = useRouter();

    // Redirect to login page with forgot form
    if (typeof window !== 'undefined') {
        router.push('/auth/login?form=forgot');
    }

    return null;
}
