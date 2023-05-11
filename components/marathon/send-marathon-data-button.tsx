import { Button } from "react-bootstrap";
import styles from "../css/Home.module.scss";
import React from "react";

export interface MarathonEvent {
    type: string;
    name: string;
    description: string;
    time: string;
    username: string;
    game: string;
    category: string;
    data: any;
}

export const SendMarathonDataButton = ({
    description,
    sessionId,
    data,
    buttonText = "Submit Event",
}: {
    description: string;
    sessionId: string;
    data: MarathonEvent;
    buttonText?: string;
}) => {
    return (
        <div>
            {description && (
                <div style={{ marginBottom: "0.5rem" }}>
                    <i>{description}</i>
                </div>
            )}
            <Button
                style={{ height: description ? "3rem" : "2rem" }}
                variant={"primary"}
                className={styles.submitEventButton}
                onClick={async () => {
                    if (
                        confirm(
                            `Are you sure you want to send the event ${data.name} to ESA?`
                        )
                    ) {
                        await sendMarathonData(sessionId, data);
                    }
                }}
            >
                {buttonText}
            </Button>
        </div>
    );
};

const sendMarathonData = async (sessionId: string, data: any) => {
    const url = process.env.NEXT_PUBLIC_MARATHON_EVENT_URL as string;

    const body = JSON.stringify({
        // eslint-disable-next-line camelcase
        session_id: sessionId,
        event: data,
    });

    await fetch(url, { method: "POST", body });
};
