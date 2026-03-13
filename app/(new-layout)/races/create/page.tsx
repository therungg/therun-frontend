import CreateRace from '~app/(new-layout)/races/create/create-race';
import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';

export default async function CreateRacePage() {
    const session = await getSession();

    confirmPermission(session, 'create', 'race');

    return <CreateRace />;
}
