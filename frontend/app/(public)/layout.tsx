import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";

/**
 * Public Pages Layout
 * Includes Navigation and Footer for all public-facing pages
 */
export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Navigation />
            <main>{children}</main>
            <Footer />
        </>
    );
}
