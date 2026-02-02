'use client';
import React, { useCallback } from 'react';
import { resetSession } from '~src/actions/reset-session.action';

export const SessionErrorBoundary = () => {
    const handleResetSession = useCallback(async () => {
        await resetSession();
        window.location.reload();
    }, []);
    return (
        <div>
            <h2>Oops, there was an error configuring the session!</h2>
            <p>
                Please reset your session by clicking the button below and then
                login again.
            </p>
            <button
                className="btn btn-primary"
                type="button"
                onClick={handleResetSession}
            >
                Reset session
            </button>
        </div>
    );
};
