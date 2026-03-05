'use client';

import Error from "next/error";
import { useEffect } from "react";

export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        console.error("Global Error Caught:", error);
    }, [error]);

    return (
        <html>
            <body>
                <Error statusCode={500} title="An unexpected error occurred." />
            </body>
        </html>
    );
}
