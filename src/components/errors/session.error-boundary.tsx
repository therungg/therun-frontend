"use client";
import React, { useCallback } from "react";
import { resetSession } from "~src/actions/reset-session.action";

export const SessionErrorBoundary = () => {
    const handleResetSession = useCallback(async () => {
        await resetSession();
        window.location.reload();
    }, [resetSession]);
    return (
        <div>
            <h2>Oops, there was an error configuring the session!</h2>
            <p>
                You can reset your session by clicking the button below. Or, if
                you&apos;re already logged in, you can manually logout and back
                in.
            </p>
            <button type="button" onClick={handleResetSession}>
                Reset session?
            </button>
        </div>
    );
};
