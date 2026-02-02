'use client';

import { useSearchParams } from 'next/navigation';
import { useActionState, useState } from 'react';
import { Form } from 'react-bootstrap';
import { joinRace } from '~app/(old-layout)/races/actions/join-race.action';
import { Race } from '~app/(old-layout)/races/races.types';
import { SubmitButton } from '~src/components/Button/SubmitButton';

export const JoinRaceForm = ({ race }: { race: Race }) => {
    const [state, formAction] = useActionState(joinRace, { message: '' });
    const [passwordInput, setPasswordInput] = useState('');

    const searchParams = useSearchParams();
    const skipPasswordCheck = searchParams.get('skipPasswordCheck');

    const { raceId, requiresPassword } = race;

    const askForPassword = requiresPassword && skipPasswordCheck !== 'true';

    return (
        <div className="w-100">
            {state?.message && (
                <span style={{ color: 'red' }}>{state.message} </span>
            )}

            {askForPassword && (
                <div className="mb-1">
                    Joining this race requires entering a password.
                </div>
            )}
            <Form action={formAction} className="d-flex gap-2 w-100">
                <input hidden name="raceId" value={raceId} readOnly />

                {askForPassword && (
                    <input
                        maxLength={100}
                        type="password"
                        name="password"
                        className="form-control"
                        onChange={(e) => {
                            setPasswordInput(e.target.value);
                        }}
                    />
                )}

                <SubmitButton
                    className="text-nowrap w-100 fs-5"
                    innerText="Join Race"
                    pendingText="Joining Race..."
                    disabled={askForPassword && !passwordInput}
                />
            </Form>
        </div>
    );
};
