'use client';

import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { forceStartRace } from '~app/(new-layout)/races/actions/force-start-race.action';
import { Button } from '~src/components/Button/Button';
import { SubmitButton } from '~src/components/Button/SubmitButton';

export const ForceStartRaceForm = ({ raceId }: { raceId: string }) => {
    const [confirming, setConfirming] = useState(false);

    if (!confirming) {
        return (
            <Button
                className="w-100 fs-5 mt-2"
                variant="primary"
                onClick={() => {
                    setConfirming(true);
                }}
            >
                Force start race
            </Button>
        );
    }

    return (
        <div className="mb-2 mt-2">
            <Form action={forceStartRace} className="gap-2 mt-2">
                <input hidden name="raceId" value={raceId} readOnly />
                <div className="mb-2">
                    This immediately readies every participant and starts the
                    race countdown, regardless of start method or readiness.
                </div>
                <div className="gap-2">
                    <SubmitButton
                        className="w-75"
                        innerText="Force start race"
                        pendingText="Force starting race..."
                        variant="primary"
                    />

                    <Button
                        className="w-25"
                        variant="secondary"
                        onClick={() => {
                            setConfirming(false);
                        }}
                    >
                        Abort
                    </Button>
                </div>
            </Form>
        </div>
    );
};
