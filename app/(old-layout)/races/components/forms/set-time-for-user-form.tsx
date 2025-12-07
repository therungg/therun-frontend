'use client';

import { useEffect, useState } from 'react';
import { Form } from 'react-bootstrap';
import { setFinalTimeForUser } from '~app/(old-layout)/races/actions/set-final-time-for-user';
import { Button } from '~src/components/Button/Button';
import { SubmitButton } from '~src/components/Button/SubmitButton';
import {
    getFormattedString,
    timeToMillis,
} from '~src/components/util/datetime';

export const SetTimeForUserForm = ({
    raceId,
    currentRaceTime,
    users,
    times,
}: {
    raceId: string;
    currentRaceTime: number;
    users: string[];
    times: (number | undefined)[];
}) => {
    const [confirmedFinalTime, setConfirmedFinalTime] =
        useState(currentRaceTime);
    const [finalTimeInput, setFinalTimeInput] = useState(
        getFormattedString(currentRaceTime.toString(), true),
    );

    const [settingState, setSettingState] = useState(false);

    useEffect(() => {
        setConfirmedFinalTime(timeToMillis(finalTimeInput));
    }, [finalTimeInput]);

    if (!settingState) {
        return (
            <Button
                className="w-100 fs-5 mt-3"
                variant="info"
                onClick={() => {
                    setSettingState(true);
                }}
            >
                Set a users time
            </Button>
        );
    }

    return (
        <div className="mb-4">
            <Form action={setFinalTimeForUser}>
                <input hidden name="raceId" value={raceId} readOnly />

                <div className="mb-2 mt-2">
                    Set the final time for a user (HH:MM:SS):
                </div>
                <div className="gap-2">
                    <select
                        className="form-select mb-2"
                        defaultValue="default"
                        name="user"
                    >
                        <option
                            key="default"
                            title="Select user"
                            value="default"
                        >
                            Select user
                        </option>
                        {users.map((user, i) => {
                            return (
                                <option
                                    key={user}
                                    title={user}
                                    value={user}
                                    onClick={() => {
                                        const time = times[i];
                                        setConfirmedFinalTime(
                                            time || currentRaceTime,
                                        );
                                        setFinalTimeInput(
                                            getFormattedString(
                                                (
                                                    time || currentRaceTime
                                                ).toString(),
                                                true,
                                            ),
                                        );
                                    }}
                                >
                                    {user}
                                </option>
                            );
                        })}
                    </select>
                    <input
                        type="text"
                        name="finalTimeInput"
                        className="form-control mt-2"
                        value={finalTimeInput}
                        onChange={(event) => {
                            setFinalTimeInput(event.target.value);
                        }}
                    />
                    <input
                        hidden
                        name="finalTime"
                        value={confirmedFinalTime}
                        readOnly
                    />
                    <div className="gap-2 mt-2">
                        <SubmitButton
                            className="w-75"
                            innerText="Set Time"
                            pendingText="Setting time..."
                            variant="info"
                        />

                        <Button
                            className="w-25"
                            variant="primary"
                            onClick={() => {
                                setSettingState(false);
                                setConfirmedFinalTime(currentRaceTime);
                                setFinalTimeInput(
                                    getFormattedString(
                                        currentRaceTime.toString(),
                                        true,
                                    ),
                                );
                            }}
                        >
                            Abort
                        </Button>
                    </div>
                </div>
            </Form>
        </div>
    );
};
