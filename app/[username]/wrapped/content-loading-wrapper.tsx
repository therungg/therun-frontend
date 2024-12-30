"use client";

import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import { User } from "../../../types/session.types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TheRunWrapped } from "~app/[username]/wrapped/the-run-wrapped";

interface ContentLoadingWrapperProps {
    user: string;
    wrapped: WrappedWithData;
    loggedinUser: User;
}

export const ContentLoadingWrapper = ({
    user,
    wrapped,
}: ContentLoadingWrapperProps) => {
    const router = useRouter();
    const [status, setStatus] = useState(wrapped.status);

    useEffect(() => {
        if (status === 0) {
            const interval = setInterval(() => {
                router.refresh();
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [status, router]);

    useEffect(() => {
        setStatus(wrapped.status);
    }, [wrapped.status]);

    if (wrapped.status === 0) {
        return (
            <div className="h-400p text-center flex-center flex-column align-items-center gap-4">
                <div className="spinner-grow text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <h2>
                    Your Wrapped is being generated. It will appear
                    automatically in a moment. Hang in there!
                </h2>
            </div>
        );
    }

    if (!wrapped?.hasEnoughRuns) {
        return (
            <div className="h-400p text-center flex-center flex-column align-items-center gap-4">
                Unfortunately, there is not enough data on your account to
                generate a Wrapped. If you think this is incorrect, please
                contact us on Discord.
            </div>
        );
    }

    return <TheRunWrapped wrapped={wrapped} user={user} />;
};
