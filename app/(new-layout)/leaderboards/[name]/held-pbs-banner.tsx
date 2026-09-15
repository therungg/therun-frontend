import { loadHeldPbsAction } from '~src/actions/pb-submission.action';
import Link from '~src/components/link';

/**
 * "You have runs waiting on you." Only the owner of the profile sees it — the
 * caller does that check. Rendered here rather than left to the notification
 * alone, because a runner who has notifications off would otherwise never learn
 * their PB is being held.
 */
export async function HeldPbsBanner() {
    const res = await loadHeldPbsAction();
    if (!res.ok || res.held.length === 0) return null;
    const n = res.held.length;
    return (
        <Link
            href="/submissions"
            className="alert alert-warning py-2 px-3 mb-0"
        >
            {n === 1
                ? '1 run is waiting for you to submit it'
                : `${n} runs are waiting for you to submit them`}
            {' — '}
            <span className="text-decoration-underline">
                {n === 1 ? 'submit it' : 'submit them'}
            </span>
        </Link>
    );
}
