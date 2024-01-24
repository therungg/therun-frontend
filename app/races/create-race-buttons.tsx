import { Can } from "~src/rbac/Can.component";
import { Button, Form } from "react-bootstrap";
import { createFictionalTestRace } from "~src/actions/races/create-fictional-test-race.action";
import { SubmitButton } from "~src/actions/components/submit-button";

export const CreateRaceButtons = () => {
    return (
        <Can I={"create"} a={"race"}>
            <a href={"/races/create"}>
                <Button>Create new race</Button>
            </a>
            <Can I={"moderate"} a={"race"}>
                <Form action={createFictionalTestRace} className={"ms-3"}>
                    <SubmitButton
                        innerText={"Create Fictional Test Race"}
                        pendingText={"Creating Race..."}
                    />
                </Form>
            </Can>
        </Can>
    );
};
