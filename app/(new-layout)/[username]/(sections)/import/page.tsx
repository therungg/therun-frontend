import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getMyImportJob } from '~src/actions/src-import.action';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import ui from '../profile-ui.module.scss';
import { ImportPanel } from './import-panel';

interface PageProps {
    params: Promise<{ username: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
    return buildMetadata({
        title: 'Import from speedrun.com',
        index: false,
        follow: false,
    });
}

/** Only the runner themself has this page; everyone else gets a 404. */
export default async function RunnerImportPage({ params }: PageProps) {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const session = await getSession();
    if (
        !session?.id ||
        !session.username ||
        session.username.toLowerCase() !== name.toLowerCase()
    ) {
        notFound();
    }

    const res = await getMyImportJob();

    return (
        <div className={ui.page}>
            <ImportPanel
                initialJob={'error' in res ? null : res.job}
                initialError={'error' in res ? res.error : null}
            />
        </div>
    );
}
