"use client";

import { useRouter } from "next/navigation";

export default function SignupPage() {
    const router = useRouter();

    // Redirect to login page with signup form
    if (typeof window !== 'undefined') {
        router.push('/auth/login?form=signup');
    }

    return null;
}
