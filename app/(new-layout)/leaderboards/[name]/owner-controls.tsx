import { getSession } from '~src/actions/session.action';
import { CustomizeButton } from './customize-button';

export async function OwnerControls({ name }: { name: string }) {
    const session = await getSession();
    if (!session.username) return null;
    if (session.username.toLowerCase() !== name.toLowerCase()) return null;
    return <CustomizeButton />;
}
