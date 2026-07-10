'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { composeDeck } from '~src/components/fast50/deck/compose-deck';
import { Deck } from '~src/components/fast50/deck/deck';
import styles from '~src/components/fast50/deck/fast50.module.scss';
import { SLIDE_COMPONENTS } from '~src/components/fast50/slides/slide-registry';
import { FIXTURES, fixturePost } from '~src/lib/fast50/fixtures';

const FIXTURE_IDS = ['grinder', 'prodigy', 'sparse'] as const;
type FixtureId = (typeof FIXTURE_IDS)[number];

const isFixtureId = (v: string | null): v is FixtureId =>
    !!v && (FIXTURE_IDS as readonly string[]).includes(v);

export const Demo = () => {
    const searchParams = useSearchParams();
    const fixtureParam = searchParams.get('fixture');
    const fixture: FixtureId = isFixtureId(fixtureParam)
        ? fixtureParam
        : 'grinder';
    const deck = searchParams.get('deck') === 'post' ? 'post' : 'pre';
    const dossier = (deck === 'post' ? fixturePost : FIXTURES)[fixture];

    return (
        <>
            <Deck
                key={`${fixture}-${deck}`}
                dossier={dossier}
                slides={composeDeck(dossier)}
                components={SLIDE_COMPONENTS}
            />
            <div className={styles.demoSwitcher}>
                {FIXTURE_IDS.map((id) => (
                    <Link
                        key={id}
                        href={`/fast50/screen/demo?fixture=${id}&deck=${deck}`}
                        data-active={id === fixture || undefined}
                    >
                        {id}
                    </Link>
                ))}
                <span className={styles.demoDivider} />
                <Link
                    href={`/fast50/screen/demo?fixture=${fixture}&deck=pre`}
                    data-active={deck === 'pre' || undefined}
                >
                    pre
                </Link>
                <Link
                    href={`/fast50/screen/demo?fixture=${fixture}&deck=post`}
                    data-active={deck === 'post' || undefined}
                >
                    post
                </Link>
            </div>
        </>
    );
};
