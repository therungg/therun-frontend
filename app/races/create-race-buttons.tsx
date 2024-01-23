import { Can } from "~src/rbac/Can.component";
import { Button, Form } from "react-bootstrap";
import { createFictionalTestRace } from "~src/actions/races/create-fictional-test-race.action";
import { SubmitButton } from "~src/actions/components/submit-button";

export const CreateRaceButtons = () => {
    return (
        <Can I={"create"} a={"race"}>
            <div className={"d-flex mb-3"}>
                <a className={"me-3"} href={"/races/create"}>
                    <Button>Create new race</Button>
                </a>
                <Can I={"moderate"} a={"race"}>
                    <Form action={createFictionalTestRace}>
                        <SubmitButton
                            innerText={"Create Fictional Test Race"}
                            pendingText={"Creating Race..."}
                        />
                    </Form>
                </Can>
            </div>
        </Can>
    );
};
