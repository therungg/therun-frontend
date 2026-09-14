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
    return buildMetadata({
        title: `${name} — Splits`,
        description: `Download ${name}'s splits files from therun.gg.`,
    });
}

export default async function RunnerSplitsPage({ params }: PageProps) {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const [head, runs] = await Promise.all([
        getRunnerProfileHead(name),
        getUserRuns(name),
    ]);
    if (!head || head.runner.guest) notFound();
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
