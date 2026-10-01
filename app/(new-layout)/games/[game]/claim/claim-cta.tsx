'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    BOARD_ROLE_LABEL,
    type BoardModRole,
} from '../../../../../types/board-claims.types';
import { BoardDialog } from '../shared/board-dialog';
import { submitBoardClaimAction } from './actions/submit-claim.action';
import styles from './claim-cta.module.scss';

export interface ClaimCtaState {
    gameId: number;
    hasModerators: boolean;
    myClaimPending: boolean;
}

const ROLE_CHOICES: { role: BoardModRole; blurb: string }[] = [
    { role: 'game-verifier', blurb: 'Check and verify submitted runs.' },
    { role: 'game-mod', blurb: 'Also edit categories, rules and variables.' },
    {
        role: 'game-admin',
        blurb: 'Also manage the mod team and board settings.',
    },
];

interface Props {
    claim: ClaimCtaState;
    gameDisplay: string;
    triggerClassName?: string;
}

export function ClaimCta({
    claim,
    gameDisplay,
    triggerClassName = 'btn btn-sm btn-outline-secondary',
}: Props) {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(claim.myClaimPending);
    const [motivation, setMotivation] = useState('');
    const [role, setRole] = useState<BoardModRole>('game-verifier');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, startSubmitting] = useTransition();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();

    if (pending) {
        return (
            <span className="text-muted small align-self-center">
                Application pending
            </span>
        );
    }

    const label = claim.hasModerators
        ? 'Apply to join the mod team'
        : 'Apply to moderate';

    const submit = () => {
        startSubmitting(async () => {
            setError(null);
            const res = await submitBoardClaimAction({
                gameId: claim.gameId,
                motivation,
                role,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setOpen(false);
            if (res.autoApprovedRole) {
                toast.success(
                    `You moderate ${gameDisplay} on speedrun.com, so you're in as ${BOARD_ROLE_LABEL[res.autoApprovedRole].toLowerCase()}.`,
                );
                router.refresh();
                return;
            }
            toast.success('Application submitted.');
            setPending(true);
        });
    };

    return (
        <>
            <button
                type="button"
                className={triggerClassName}
                onClick={() => setOpen(true)}
            >
                {label}
            </button>
            <BoardDialog
                open={open}
                onClose={() => setOpen(false)}
                labelledBy="claim-cta-title"
                size="md"
                initialFocusRef={textareaRef}
                closeOnBackdropClick={!isSubmitting}
            >
                <div className={styles.header}>
                    <h5 className={styles.title} id="claim-cta-title">
                        {claim.hasModerators
                            ? `Join the ${gameDisplay} mod team`
                            : `Moderate ${gameDisplay}`}
                    </h5>
                </div>
                <div className={styles.body}>
                    <p className={styles.blurb}>
                        {claim.hasModerators
                            ? 'Your application goes to this board’s moderators.'
                            : 'This board has no moderators yet. Tell the site admins why you’re a good fit. Your run history here is attached automatically.'}
                    </p>
                    <fieldset className={styles.roles} disabled={isSubmitting}>
                        <legend className={styles.rolesLegend}>Apply as</legend>
                        {ROLE_CHOICES.map((c) => (
                            <label
                                key={c.role}
                                className={styles.roleOption}
                                data-selected={role === c.role}
                            >
                                <input
                                    type="radio"
                                    name="claim-role"
                                    value={c.role}
                                    checked={role === c.role}
                                    onChange={() => setRole(c.role)}
                                />
                                <span>
                                    <span className={styles.roleName}>
                                        {BOARD_ROLE_LABEL[c.role]}
                                    </span>
                                    <span className={styles.roleBlurb}>
                                        {c.blurb}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </fieldset>
                    <textarea
                        ref={textareaRef}
                        className={styles.textarea}
                        rows={5}
                        value={motivation}
                        onChange={(e) => setMotivation(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="Why do you want to moderate this board?"
                    />
                    {error && <div className={styles.error}>{error}</div>}
                </div>
                <div className={styles.footer}>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setOpen(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={isSubmitting || motivation.trim().length < 10}
                        onClick={submit}
                    >
                        {isSubmitting ? 'Submitting…' : 'Submit application'}
                    </button>
                </div>
            </BoardDialog>
        </>
    );
}
