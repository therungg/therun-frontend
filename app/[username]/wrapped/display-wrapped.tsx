"use client";

import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import { User } from "../../../types/session.types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RenderFinishedWrapped } from "~app/[username]/wrapped/render-finished-wrapped";

interface DisplayWrappedProps {
    user: string;
    wrapped: WrappedWithData;
    loggedinUser: User;
}

export const DisplayWrapped = ({ user, wrapped }: DisplayWrappedProps) => {
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

    return <RenderFinishedWrapped wrapped={wrapped} user={user} />;
};
