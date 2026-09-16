import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getUserRuns } from '~src/lib/get-user-runs';
import { getRunnerProfileHead } from '~src/lib/runner-profile';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { ProfileBlock } from '../profile-block';
import ui from '../profile-ui.module.scss';
import { plural } from '../ranks';
import { ProfileLayouts } from './profile-layouts';
import { SplitsPanel } from './splits-panel';

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
        title: `${head.runner.name} — Downloads`,
        description: `Download ${head.runner.name}'s splits files from therun.gg.`,
    });
}

export default async function RunnerSplitsPage({ params }: PageProps) {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const head = await getRunnerProfileHead(name);
    if (!head || head.runner.guest) notFound();
    const runs = (await getUserRuns(name)) ?? [];
    const withFile = runs.filter((r) => r.splitsFile).length;

    return (
        <div className={ui.page}>
            {runs.length === 0 ? (
                <p className={ui.empty}>No splits uploaded yet.</p>
            ) : (
                <ProfileBlock
                    title="Splits files"
                    note={`${plural(withFile, 'file', 'files')} to download for LiveSplit`}
                >
                    <SplitsPanel runs={runs} username={head.runner.name} />
                </ProfileBlock>
            )}
            <ProfileLayouts username={head.runner.name} />
        </div>
    );
}
