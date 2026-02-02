import { PublicLayoutClient } from "@/components/layout/PublicLayoutClient";

/**
 * Public Pages Layout
 * Full-width/boxed is controlled here via PublicLayoutClient so child components
 * don't need useLayout() for container width.
 */
export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PublicLayoutClient>{children}</PublicLayoutClient>;
}
