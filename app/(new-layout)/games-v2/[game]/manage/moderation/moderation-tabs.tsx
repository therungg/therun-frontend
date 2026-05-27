'use client';

import { useState } from 'react';
import Link from '~src/components/link';
import type { AttentionItem } from './attention/attention-model';
import { NeedsAttention } from './attention/needs-attention';

type Tab = 'moderate' | 'configure';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    canConfigure: boolean;
    items: AttentionItem[];
    categories: Array<{ id: number; display: string }>;
}

export function ModerationTabs({
    gameSlug,
    gameDisplay,
    canConfigure,
    items,
    categories,
}: Props) {
    const [tab, setTab] = useState<Tab>('moderate');
    const baseHref = `/games-v2/${gameSlug}/manage/moderation`;

    return (
        <div className="container py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h1 className="h4 mb-0">Moderation — {gameDisplay}</h1>
                <Link
                    href={`/games-v2/${gameSlug}`}
                    className="btn btn-sm btn-outline-secondary"
                >
                    Back to leaderboards
                </Link>
            </div>

            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        type="button"
                        className={`nav-link ${tab === 'moderate' ? 'active' : ''}`}
                        onClick={() => setTab('moderate')}
                    >
                        Moderate
                        {items.length > 0 && (
                            <span className="badge rounded-pill text-bg-danger ms-2">
                                {items.length > 99 ? '99+' : items.length}
                            </span>
                        )}
                    </button>
                </li>
                {canConfigure && (
                    <li className="nav-item">
                        <button
                            type="button"
                            className={`nav-link ${tab === 'configure' ? 'active' : ''}`}
                            onClick={() => setTab('configure')}
                        >
                            Configure
                        </button>
                    </li>
                )}
            </ul>

            {tab === 'moderate' && (
                <NeedsAttention
                    gameSlug={gameSlug}
                    gameDisplay={gameDisplay}
                    items={items}
                    categories={categories}
                />
            )}

            {tab === 'configure' && canConfigure && (
                <ConfigurePlaceholder baseHref={baseHref} />
            )}
        </div>
    );
}

/**
 * Phase 2 placeholder: link to the still-standalone configuration pages.
 * Phase 4 embeds these surfaces directly in this tab.
 */
function ConfigurePlaceholder({ baseHref }: { baseHref: string }) {
    const links: Array<{ href: string; title: string; blurb: string }> = [
        {
            href: `${baseHref}/policies`,
            title: 'Board policies',
            blurb: 'Minimum/maximum times, video requirements, and auto-flag thresholds.',
        },
        {
            href: `${baseHref}/rules`,
            title: 'Exclusion rules',
            blurb: 'View and remove standing user-exclusion rules for this game.',
        },
        {
            href: `${baseHref}/log`,
            title: 'Mod action log',
            blurb: 'Recent moderation actions, with undo for fresh entries.',
        },
    ];

    return (
        <div className="row g-3">
            {links.map((l) => (
                <div className="col-md-4" key={l.href}>
                    <Link
                        href={l.href}
                        className="card h-100 text-decoration-none text-reset"
                    >
                        <div className="card-body">
                            <h2 className="h6">{l.title}</h2>
                            <p className="text-muted small mb-0">{l.blurb}</p>
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    );
}
