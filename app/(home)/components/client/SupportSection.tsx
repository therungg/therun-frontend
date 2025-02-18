"use client";

import { useEffect, useState } from "react";
import { Card } from "react-bootstrap";
import { Button } from "~src/components/Button/Button";
import { NameAsPatreon } from "~src/components/patreon/patreon-name";
import { usePatreons } from "~src/components/patreon/use-patreons";

export default function SupportSection() {
    const { data: patreons, isLoading } = usePatreons();
    const [patron, setPatron] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!isLoading && patreons) {
            const patronNames = Object.keys(patreons);

            setPatron(
                patronNames[Math.floor(Math.random() * patronNames.length)],
            );
        }
    }, [isLoading, patreons]);

    return (
        <Card className="bg-dark bg-opacity-50 border-light border-opacity-10 text-center">
            <Card.Body>
                <h2 className="display-5 mb-4">The Run needs YOU!</h2>
                <p className="fs-4 text-light opacity-90">
                    We couldn't do what we do without the support of our
                    wonderful Patrons.
                </p>
                <p className="fs-4 text-light opacity-90">
                    The Run is not for profit, and we don't serve pesky ads.
                </p>
                <p className="fs-4 text-light opacity-90 pt-2">
                    If The Run has brought you value, please consider joining{" "}
                    {patron ? <NameAsPatreon name={patron} /> : "....."} and
                    others in supporting us on Patreon!
                </p>
                <Button variant="success" className="mt-4">
                    Support us
                </Button>
            </Card.Body>
        </Card>
    );
}
