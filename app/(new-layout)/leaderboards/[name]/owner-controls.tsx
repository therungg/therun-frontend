import { getSession } from '~src/actions/session.action';
import { CustomizeButton } from './customize-button';
import { HeldPbsBanner } from './held-pbs-banner';

export async function OwnerControls({ name }: { name: string }) {
    const session = await getSession();
    if (!session.username) return null;
    if (session.username.toLowerCase() !== name.toLowerCase()) return null;
    return (
        <>
            <HeldPbsBanner />
            <CustomizeButton />
        </>
    );
}
