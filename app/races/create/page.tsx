import { getSession } from "~src/actions/session.action";
import { canCreateRace } from "~src/lib/races";
import CreateRace from "~app/races/create/create-race";

export default async function CreateRacePage() {
    const session = await getSession();

    if (!session.id)
        return <div>Please login with Twitch to create a race</div>;

    if (!(await canCreateRace(session.id)))
        return <div>You cannot create a race right now.</div>;

    return <CreateRace />;
}
