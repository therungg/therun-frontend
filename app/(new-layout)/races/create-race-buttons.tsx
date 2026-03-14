import { IconButton } from '~src/components/Button/IconButton';
import Link from '~src/components/link';
import { PlusIcon } from '~src/icons/plus-icon';
import { Can } from '~src/rbac/Can.component';

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
