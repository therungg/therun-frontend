import React from 'react';
import { Button, ButtonProps } from '~src/components/Button/Button';

export interface MarathonEvent {
    type: string;
    name: string;
    description: string;
    time: string;
    username: string;
    game: string;
    category: string;
    // TODO: get the type for this
    data: unknown;
}

interface SendMarathonDataButtonProps extends ButtonProps {
    description?: string;
    sessionId: string;
    data: MarathonEvent;
}

export const SendMarathonDataButton: React.FunctionComponent<
    SendMarathonDataButtonProps
> = ({ description, sessionId, data, children = 'Submit Event' }) => {
    return (
        <div>
            {description && (
                <div className="mb-2">
                    <i>{description}</i>
                </div>
            )}
            <Button
                className={`w-100 fw-medium d-inline-flex justify-content-center 
                    align-items-center ${description ? 'h-3r' : 'h-2r'}`}
                onClick={async () => {
                    if (
                        confirm(
                            `Are you sure you want to send the event ${data.name} to ESA?`,
                        )
                    ) {
                        await sendMarathonData(sessionId, data);
                    }
                }}
            >
                {children}
            </Button>
        </div>
    );
};

const sendMarathonData = async (sessionId: string, data: MarathonEvent) => {
    const url = process.env.NEXT_PUBLIC_MARATHON_EVENT_URL as string;

    const body = JSON.stringify({
        session_id: sessionId,
        event: data,
    });

    await fetch(url, { method: 'POST', body });
};
