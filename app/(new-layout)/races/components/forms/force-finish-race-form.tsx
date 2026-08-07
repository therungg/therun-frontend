'use client';

import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { forceFinishRace } from '~app/(new-layout)/races/actions/force-finish-race.action';
import { Button } from '~src/components/Button/Button';
import { SubmitButton } from '~src/components/Button/SubmitButton';

export const ForceFinishRaceForm = ({ raceId }: { raceId: string }) => {
    const [confirming, setConfirming] = useState(false);

    if (!confirming) {
        return (
            <Button
                className="w-100 fs-5 mt-2"
                variant="danger"
                onClick={() => {
                    setConfirming(true);
                }}
            >
                Force finish race
            </Button>
        );
    }

    return (
        <div className="mb-2 mt-2">
            <Form action={forceFinishRace} className="gap-2 mt-2">
                <input hidden name="raceId" value={raceId} readOnly />
                <div className="mb-2">
                    This immediately ends the race: participants with a final
                    time are confirmed, everyone else is disqualified, and the
                    race is closed. This cannot be undone.
                </div>
                <div className="gap-2">
                    <SubmitButton
                        className="w-75"
                        innerText="Force finish race"
                        pendingText="Force finishing race..."
                        variant="danger"
                    />

                    <Button
                        className="w-25"
                        variant="primary"
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
