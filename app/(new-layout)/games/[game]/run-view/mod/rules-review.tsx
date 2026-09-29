'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from '~src/components/link';
import { buildManageHref } from '~src/lib/board-url';
import type {
    AutoVerifyCheckName,
    AutoVerifyCheckResult,
} from '../../../../../../types/moderation.types';
import { rulesInlineProps } from '../../manage/moderation/moderate/rules-inline';
import rulesStyles from '../../rules/board-rules.module.scss';
import { buildRuleTiers } from '../../rules/rule-tiers';
import type { ModContext } from '../load-run-view';
import { AUTO_VERIFY_CHECK_LABELS } from '../run-badges';
import type { RunViewModel } from '../run-view';
import styles from './mod-layer.module.scss';

/**
 * The automatic checks' results, then the rules the board judges runs by,
 * open: the moderator reads them against the run, so they are not folded
 * away behind a toggle the way the sheet's reference copy is.
 */
export function RulesReview({
    model,
    mod,
}: {
    model: RunViewModel;
    mod: ModContext;
}) {
    const [tierId, setTierId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [overflowing, setOverflowing] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const idBase = useId();
    const tabId = (id: string) => `${idBase}-tab-${id}`;
    const panelId = `${idBase}-panel`;
    const checks = Object.entries(
        model.autoVerifyResult?.checks ?? {},
    ) as Array<[AutoVerifyCheckName, AutoVerifyCheckResult]>;
    const tiers = buildRuleTiers(rulesInlineProps(mod.board, mod.sheet));

    // The most specific tier first: the category's rules are the ones a run
    // on this board is most often judged by.
    const active = tiers.find((t) => t.id === tierId) ?? tiers.at(-1) ?? null;
    const editHref = `${buildManageHref(mod.sheet.gameSlug, 'rules')}&cat=${model.categoryId}`;

    // A fresh tier starts folded again, then measures itself against the cap.
    useEffect(() => {
        setExpanded(false);
    }, [active?.id]);

    useEffect(() => {
        const el = textRef.current;
        // Only reliable while clamped — expanded text always fits itself.
        if (!el || expanded) return;
        const measure = () =>
            setOverflowing(el.scrollHeight > el.clientHeight + 1);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [expanded]);

    if (checks.length === 0 && tiers.length === 0) return null;

    // Arrow keys move between the tiers and pick the one they land on, the
    // way a tab list does; Tab itself goes straight on to the rules.
    const onTabKey = (e: React.KeyboardEvent, index: number) => {
        const last = tiers.length - 1;
        const next =
            e.key === 'ArrowRight'
                ? index === last
                    ? 0
                    : index + 1
                : e.key === 'ArrowLeft'
                  ? index === 0
                      ? last
                      : index - 1
                  : e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? last
                      : null;
        if (next == null) return;
        e.preventDefault();
        setTierId(tiers[next].id);
        tabsRef.current
            ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
            [next]?.focus();
    };

    return (
        <section className={styles.panel}>
            <div className={styles.head}>
                <span className={styles.eyebrow}>
                    {mod.board.categoryDisplay} rules
                </span>
                <Link href={editHref} className={styles.headLink}>
                    Edit rules
                </Link>
            </div>
            {checks.length > 0 && (
                <div className={styles.checks}>
                    {checks.map(([name, check]) => (
                        <div key={name} className={styles.check}>
                            <span
                                className={`${styles.checkMark} ${check.pass ? styles.checkPass : styles.checkFail}`}
                                aria-hidden
                            >
                                {check.pass ? '✓' : '✗'}
                            </span>
                            <span className="visually-hidden">
                                {check.pass ? 'Passed: ' : 'Failed: '}
                            </span>
                            <span>
                                {AUTO_VERIFY_CHECK_LABELS[name] ?? name}
                                {!check.pass && check.reason && (
                                    <span className={styles.muted}>
                                        {' '}
                                        · {check.reason}
                                    </span>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {active && (
                <div
                    className={`${styles.rules} ${checks.length > 0 ? styles.rulesAfterChecks : ''}`}
                >
                    {tiers.length > 1 && (
                        <div
                            ref={tabsRef}
                            className={styles.rulesTabs}
                            role="tablist"
                            aria-label="Rules"
                        >
                            {tiers.map((tier, i) => {
                                const on = tier.id === active.id;
                                return (
                                    <button
                                        key={tier.id}
                                        id={tabId(tier.id)}
                                        type="button"
                                        role="tab"
                                        className={`${styles.rulesTab} ${on ? styles.rulesTabOn : ''}`}
                                        aria-selected={on}
                                        aria-controls={panelId}
                                        tabIndex={on ? 0 : -1}
                                        onClick={() => setTierId(tier.id)}
                                        onKeyDown={(e) => onTabKey(e, i)}
                                    >
                                        {tier.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {/* Set the way the board's own rules dialog sets them. */}
                    <div
                        ref={textRef}
                        id={panelId}
                        role={tiers.length > 1 ? 'tabpanel' : undefined}
                        aria-labelledby={
                            tiers.length > 1 ? tabId(active.id) : undefined
                        }
                        className={`${rulesStyles.text} ${styles.rulesText} ${
                            expanded ? '' : styles.rulesTextClamped
                        }`}
                    >
                        {active.body}
                    </div>
                    {overflowing && (
                        <button
                            type="button"
                            className={styles.rulesToggle}
                            onClick={() => setExpanded((v) => !v)}
                        >
                            {expanded ? 'Show less' : 'Show all rules'}
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}
