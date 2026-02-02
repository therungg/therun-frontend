'use client'; // Error components must be Client Components

import Link from 'next/link';
import React from 'react';
import { Button } from '~src/components/Button/Button';

export default function Error({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    React.useEffect(() => {
        // TODO: Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div className="text-center">
                <h2 className="display-5 mb-3 fw-medium">
                    Something went wrong!
                </h2>
                <p className="lead mb-4">
                    Sorry about that. Let's try that again.
                </p>
                <Button
                    className="btn btn-primary px-4 py-2"
                    onClick={
                        // Attempt to recover by trying to re-render the segment
                        () => reset()
                    }
                >
                    Try again
                </Button>
                <p className="lead mt-5">
                    You can also let us know about the issue in our&nbsp;
                    <Link
                        href={process.env.NEXT_PUBLIC_DISCORD_URL}
                        target="_blank"
                        rel="noreferrer"
                        prefetch={false}
                    >
                        Discord
                    </Link>
                    .
                </p>
            </div>
        </div>
    );
}
