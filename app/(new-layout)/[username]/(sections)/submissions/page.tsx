import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { loadWaitingOnYouAction } from '~src/actions/pb-submission.action';
import { getSession } from '~src/actions/session.action';
import { WaitingOnYouProvider } from '~src/components/waiting-on-you/waiting-on-you-provider';
import buildMetadata from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import sectionStyles from '../sections.module.scss';
import { WaitingList } from './waiting-list';

export const metadata = buildMetadata({
    title: 'Runs waiting on you',
    description: 'Runs a board is holding until you act on them.',
});

interface PageProps {
    params: Promise<{ username: string }>;
}

export default function SubmissionsPage({ params }: PageProps) {
    return (
        <Suspense fallback={null}>
            <Submissions params={params} />
        </Suspense>
    );
}

async function Submissions({ params }: PageProps) {
    const { username } = await params;
    const name = safeDecodeURI(username);
    const session = await getSession();
    // Only the runner themselves: everyone else gets the same 404 as a typo.
    if (session.username?.toLowerCase() !== name.toLowerCase()) notFound();

    const res = await loadWaitingOnYouAction(name);
    if (!res.ok) {
        return (
            <section className={sectionStyles.panel}>
                <p className={sectionStyles.empty}>{res.error}</p>
            </section>
        );
    }
    return (
        <WaitingOnYouProvider initial={res}>
            <WaitingList />
        </WaitingOnYouProvider>
    );
}
