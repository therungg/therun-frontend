import { getSession } from '~src/actions/session.action';
import styles from '~src/components/fast50/prep/prep-studio.module.scss';
import { Studio } from '~src/components/fast50/prep/studio';
import { getRunnerDossier } from '~src/lib/fast50/dossier';
import { getPrepSession, listPrepSessions } from '~src/lib/fast50/prep';
import type { PrepSession } from '~src/lib/fast50/prep.types';
import { confirmPermission } from '~src/rbac/confirm-permission';

export const metadata = {
    robots: { index: false, follow: false },
};

export default async function PrepStudioPage({
    params,
    searchParams,
}: {
    params: Promise<{ username: string; game: string; category: string }>;
    searchParams: Promise<{ session?: string }>;
}) {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'event');
    } catch {
        return <main className={styles.denied}>Not authorized.</main>;
    }

    const { username, game, category } = await params;
    const { session } = await searchParams;
    const u = decodeURIComponent(username);
    const g = decodeURIComponent(game);
    const c = decodeURIComponent(category);

    const [dossierPre, dossierPost] = await Promise.all([
        getRunnerDossier(u, g, c, 'pre'),
        getRunnerDossier(u, g, c, 'post'),
    ]);
    if (!dossierPre) {
        return (
            <main className={styles.denied}>
                No data found for this runner/game/category.
            </main>
        );
    }

    const sessions = await listPrepSessions(user.id, u, g, c).catch(() => []);
    const requested = session ? Number(session) : sessions[0]?.id;
    let initial: PrepSession | null = null;
    if (requested && Number.isInteger(requested) && requested > 0) {
        initial = await getPrepSession(user.id, requested).catch(() => null);
    }

    return (
        <main className={styles.page}>
            <Studio
                key={initial?.id ?? 'new'}
                runner={{ username: u, game: g, category: c }}
                dossierPre={dossierPre}
                dossierPost={dossierPost}
                sessions={sessions}
                initial={initial}
            />
        </main>
    );
}
