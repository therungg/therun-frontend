'use client';

import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { kickUser } from '~app/(old-layout)/races/actions/kick-user.action';
import { Button } from '~src/components/Button/Button';
import { SubmitButton } from '~src/components/Button/SubmitButton';

export const KickUserForm = ({
    raceId,
    users,
}: {
    raceId: string;
    users: string[];
}) => {
    const [banningState, setBanningState] = useState(false);

    if (!banningState) {
        return (
            <Button
                className="w-100 fs-5 mt-3"
                variant="danger"
                onClick={() => {
                    setBanningState(true);
                }}
            >
                Kick a user
            </Button>
        );
    }

    return (
        <div className="mb-4 mt-2">
            <Form action={kickUser} className="gap-2 mt-2">
                <input hidden name="raceId" value={raceId} readOnly />
                <div className="mb-2">
                    You can kick a user from the race if they are AFK or if they
                    submitted an incorrect time.
                </div>
                <div className="mb-1">Select a user to kick from the race:</div>
                <select
                    className="form-select mb-2"
                    defaultValue="default"
                    name="user"
                >
                    <option
                        key="default"
                        title="Select user to kick"
                        value="default"
                    >
                        Select user to kick
                    </option>
                    {users.map((user) => {
                        return (
                            <option key={user} title={user} value={user}>
                                {user}
                            </option>
                        );
                    })}
                </select>
                <div className="mb-1">Reason for kicking the user:</div>
                <input
                    maxLength={200}
                    type="text"
                    name="reason"
                    className="form-control mb-2"
                />
                <div className="gap-2">
                    <SubmitButton
                        className="w-75"
                        innerText="Kick user"
                        pendingText="Kicking user..."
                        variant="danger"
                    />

                    <Button
                        className="w-25"
                        variant="primary"
                        onClick={() => {
                            setBanningState(false);
                        }}
                    >
                        Abort
                    </Button>
                </div>
            </Form>
        </div>
    );
};
