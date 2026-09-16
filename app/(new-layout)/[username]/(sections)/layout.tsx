import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getRunnerProfileHead } from '~src/lib/runner-profile';
import { safeDecodeURI } from '~src/utils/uri';
import { ProfileShell } from './profile-shell';

export default async function ProfileSectionsLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ username: string }>;
}) {
    const { username } = await params;
    const head = await getRunnerProfileHead(safeDecodeURI(username));
    if (!head) notFound();
    return <ProfileShell head={head}>{children}</ProfileShell>;
}
