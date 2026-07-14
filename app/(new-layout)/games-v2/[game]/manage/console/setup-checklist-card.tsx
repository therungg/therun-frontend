import Link from '~src/components/link';
import type { BoardCompleteness } from '~src/lib/setup/completeness';

interface Props {
    gameSlug: string;
    completeness: BoardCompleteness;
}

export function SetupChecklistCard({ gameSlug, completeness }: Props) {
    const open = completeness.steps.filter((s) => s.status !== 'done');
    if (open.length === 0) return null;

    return (
        <div className="card mb-3 border-primary">
            <div className="card-body d-flex align-items-center gap-3 flex-wrap">
                <div>
                    <strong>
                        Finish setup — {completeness.doneCount} of{' '}
                        {completeness.totalCount} done
                    </strong>
                    <div className="text-muted small">
                        {open.map((s) => s.summary).join(' · ')}
                    </div>
                </div>
                <Link
                    href={`/games-v2/${gameSlug}/setup${
                        completeness.firstIncomplete
                            ? `?step=${completeness.firstIncomplete}`
                            : ''
                    }`}
                    className="btn btn-sm btn-primary ms-auto"
                >
                    {completeness.doneCount <= 1
                        ? 'Set up this board'
                        : 'Finish setup'}
                </Link>
            </div>
        </div>
    );
}
