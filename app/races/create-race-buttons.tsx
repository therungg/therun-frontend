import { Can } from "~src/rbac/Can.component";
import { PlusIcon } from "~src/icons/plus-icon";
import { IconButton } from "~src/components/Button/IconButton";
import Link from "next/link";

export const CreateRaceButtons = () => {
    return (
        <Can I="create" a="race">
            <Link href="/races/create">
                <IconButton icon={<PlusIcon />} iconPosition="right">
                    Create new race
                </IconButton>
            </Link>
        </Can>
    );
};
