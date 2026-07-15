'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Form, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { selfClaimTimeAction } from '~src/actions/self-claim.action';
import type { ModTiming } from '../../../../types/moderation.types';
import { parseTimeInput } from './manage/moderation/shared/time-format';

interface Props {
    gameId: number;
    categories: Array<{ id: number; display: string }>;
    defaultCategoryId: number;
    defaultSubcategoryKey?: string;
}

/**
 * Lets a signed-in runner assert/correct their own leaderboard time. The server
 * trust-gates it: a time that can't improve their standing applies instantly;
 * a new best is held as a provisional self-claim for moderator review.
 */
export function SelfClaimButton({
    gameId,
    categories,
    defaultCategoryId,
    defaultSubcategoryKey = '',
}: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [categoryId, setCategoryId] = useState(defaultCategoryId);
    const [subcategoryKey, setSubcategoryKey] = useState(defaultSubcategoryKey);
    const [timing, setTiming] = useState<ModTiming>('realtime');
    const [timeText, setTimeText] = useState('');
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [pending, start] = useTransition();

    const timeMs = parseTimeInput(timeText);
    const timeValid = timeMs != null && !Number.isNaN(timeMs);

    const close = () => {
        setOpen(false);
        setTimeText('');
        setEvidenceUrl('');
    };

    const submit = () => {
        if (!timeValid) return;
        start(async () => {
            const res = await selfClaimTimeAction({
                gameId,
                categoryId,
                subcategoryKey: subcategoryKey.trim(),
                timing,
                timeMs: timeMs as number,
                evidenceUrl: evidenceUrl.trim() || null,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(
                res.applied === 'provisional'
                    ? 'Submitted — a moderator will review your time.'
                    : 'Your time was added to the leaderboard.',
            );
            close();
            router.refresh();
        });
    };

    return (
        <>
            <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setOpen(true)}
            >
                Submit / correct my time
            </button>
            <Modal show={open} onHide={close} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="h6">Submit my time</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="small text-muted">
                        Assert your real time for this board, even if no run was
                        uploaded. A faster legitimate run will replace it
                        automatically. A claim that beats your current standing
                        is reviewed by a moderator before it's verified.
                    </p>
                    <div className="row g-2">
                        <div className="col-12">
                            <label
                                htmlFor="sc-category"
                                className="form-label small text-muted mb-1"
                            >
                                Category
                            </label>
                            <select
                                id="sc-category"
                                className="form-select form-select-sm"
                                value={categoryId}
                                onChange={(e) =>
                                    setCategoryId(
                                        Number.parseInt(e.target.value, 10),
                                    )
                                }
                                disabled={pending}
                            >
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.display}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-6">
                            <label
                                htmlFor="sc-timing"
                                className="form-label small text-muted mb-1"
                            >
                                Timing
                            </label>
                            <select
                                id="sc-timing"
                                className="form-select form-select-sm"
                                value={timing}
                                onChange={(e) =>
                                    setTiming(e.target.value as ModTiming)
                                }
                                disabled={pending}
                            >
                                <option value="realtime">Real time</option>
                                <option value="gametime">Game time</option>
                            </select>
                        </div>
                        <div className="col-6">
                            <label
                                htmlFor="sc-time"
                                className="form-label small text-muted mb-1"
                            >
                                Time
                            </label>
                            <Form.Control
                                id="sc-time"
                                size="sm"
                                type="text"
                                value={timeText}
                                onChange={(e) => setTimeText(e.target.value)}
                                placeholder="e.g. 35:48"
                                disabled={pending}
                            />
                        </div>
                        <div className="col-12">
                            <label
                                htmlFor="sc-subkey"
                                className="form-label small text-muted mb-1"
                            >
                                Subcategory key (leave blank if none)
                            </label>
                            <Form.Control
                                id="sc-subkey"
                                size="sm"
                                type="text"
                                value={subcategoryKey}
                                onChange={(e) =>
                                    setSubcategoryKey(e.target.value)
                                }
                                placeholder="(none)"
                                disabled={pending}
                            />
                        </div>
                        <div className="col-12">
                            <label
                                htmlFor="sc-evidence"
                                className="form-label small text-muted mb-1"
                            >
                                Evidence URL (optional)
                            </label>
                            <Form.Control
                                id="sc-evidence"
                                size="sm"
                                type="url"
                                value={evidenceUrl}
                                onChange={(e) => setEvidenceUrl(e.target.value)}
                                placeholder="https://… (VOD / proof)"
                                disabled={pending}
                            />
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={close}
                        disabled={pending}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={submit}
                        disabled={pending || !timeValid}
                    >
                        {pending ? 'Submitting…' : 'Submit time'}
                    </button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
