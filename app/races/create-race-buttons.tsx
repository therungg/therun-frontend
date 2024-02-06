import { Can } from "~src/rbac/Can.component";
import { Button } from "react-bootstrap";

export const CreateRaceButtons = () => {
    return (
        <Can I={"create"} a={"race"}>
            <a href={"/races/create"}>
                <Button>Create new race</Button>
            </a>
        </Can>
    );
};
