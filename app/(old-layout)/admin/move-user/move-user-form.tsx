'use client';

import { FormEvent, useState } from 'react';
import { moveUserAction } from './actions/move-user.action';

export const MoveUserForm = () => {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [status, setStatus] = useState<
        'idle' | 'loading' | 'success' | 'error'
    >('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!from.trim() || !to.trim()) return;

        setStatus('loading');
        setErrorMessage('');

        try {
            await moveUserAction(from.trim(), to.trim());
            setStatus('success');
            setFrom('');
            setTo('');
        } catch (err) {
            setStatus('error');
            setErrorMessage(
                err instanceof Error ? err.message : 'An error occurred',
            );
        }
    };

    return (
        <div className="container mt-5" style={{ maxWidth: '600px' }}>
            <div className="card shadow-sm border-0">
                <div className="card-header bg-primary text-white">
                    <h4 className="mb-0">Move User</h4>
                </div>
                <div className="card-body">
                    <p className="text-muted mb-4">
                        Move a user from one username to another. This will
                        transfer all data to the new username.
                    </p>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label
                                htmlFor="from"
                                className="form-label fw-bold"
                            >
                                From (current username)
                            </label>
                            <input
                                type="text"
                                id="from"
                                className="form-control"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                placeholder="Current username"
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="to" className="form-label fw-bold">
                                To (new username)
                            </label>
                            <input
                                type="text"
                                id="to"
                                className="form-control"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                placeholder="New username"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary w-100"
                            disabled={
                                status === 'loading' ||
                                !from.trim() ||
                                !to.trim()
                            }
                        >
                            {status === 'loading'
                                ? 'Moving user...'
                                : 'Move User'}
                        </button>
                    </form>

                    {status === 'success' && (
                        <div className="alert alert-success mt-3 mb-0">
                            User moved successfully.
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="alert alert-danger mt-3 mb-0">
                            {errorMessage}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
