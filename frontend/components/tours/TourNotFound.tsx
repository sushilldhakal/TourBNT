import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Search } from "lucide-react";

export function TourNotFound() {
    return (
        <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto text-center">
                <div className="bg-destructive/10 border border-destructive/20 p-8 rounded-lg">
                    <div className="flex justify-center mb-4">
                        <div className="bg-destructive/20 p-4 rounded-full">
                            <AlertCircle className="h-12 w-12 text-destructive" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-destructive mb-3">
                        Tour Not Found
                    </h1>

                    <p className="text-muted-foreground mb-6 text-lg">
                        The tour you're looking for doesn't exist or has been removed.
                        It may have been deleted or the URL might be incorrect.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/tours">
                            <Button variant="default" className="w-full sm:w-auto">
                                <Search className="mr-2 h-4 w-4" />
                                Browse All Tours
                            </Button>
                        </Link>

                        <Link href="/">
                            <Button variant="outline" className="w-full sm:w-auto">
                                <Home className="mr-2 h-4 w-4" />
                                Back to Home
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="mt-8 text-sm text-muted-foreground">
                    <p>Need help? Contact our support team or try searching for other tours.</p>
                </div>
            </div>
        </div>
    );
}
