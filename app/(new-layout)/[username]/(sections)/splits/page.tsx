import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProfileDownloadsTab } from '~src/components/run/downloads/profile-downloads-tab';
import { getUserRuns } from '~src/lib/get-user-runs';
import { getRunnerProfileHead } from '~src/lib/runner-profile';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import styles from '../sections.module.scss';

interface PageProps {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const head = await getRunnerProfileHead(name);
    if (!head || head.runner.guest) {
        return buildMetadata({ description: 'Runner profile' });
    }
    return buildMetadata({
        title: `${head.runner.name} — Splits`,
        description: `Download ${head.runner.name}'s splits files from therun.gg.`,
    });
}

export default async function RunnerSplitsPage({ params }: PageProps) {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const head = await getRunnerProfileHead(name);
    if (!head || head.runner.guest) notFound();
    const runs = (await getUserRuns(name)) ?? [];
    if (runs.length === 0) {
        return <p className={styles.empty}>No splits uploaded yet.</p>;
    }
    return (
        <section className={styles.panel} aria-label="Splits">
            <ProfileDownloadsTab
                username={head.runner.name}
                runs={runs}
                isActive
            />
        </section>
    );
}
