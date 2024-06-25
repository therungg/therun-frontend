import { Can } from "~src/rbac/Can.component";
import { Button } from "react-bootstrap";
import { PlusIcon } from "~src/icons/plus-icon";

export const CreateRaceButtons = () => {
    return (
        <Can I="create" a="race">
            <a href="/races/create">
                <Button>
                    Create new race
                    <span className="ms-2">
                        <PlusIcon />
                    </span>
                </Button>
            </a>
        </Can>
    );
};
