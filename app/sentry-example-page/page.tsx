'use client';

import { Button } from "@/components/ui/button";

export default function SentryExamplePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <h1 className="text-2xl font-bold">Sentry Testing Page</h1>
            <p className="text-muted-foreground">Click the button for a sample error.</p>

            <Button
                variant="destructive"
                onClick={() => {
                    throw new Error("Sentry Test Error: Client-Side Crash");
                }}
            >
                Throw Client Error
            </Button>
        </div>
    );
}
