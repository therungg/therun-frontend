import type { ReactNode } from 'react';
import { getSession } from '~src/actions/session.action';
import { LoginRequired } from './login-required';
import { SettingsChrome } from './settings-chrome';

export default async function SettingsLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await getSession();
    if (!session.id || !session.username) {
        return <LoginRequired returnTo="/settings" />;
    }
    return (
        <SettingsChrome username={session.username}>{children}</SettingsChrome>
    );
}
