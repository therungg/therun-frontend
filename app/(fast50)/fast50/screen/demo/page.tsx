import Link from 'next/link';
import React from 'react';
import { composePreppedDeck } from '~src/components/fast50/deck/compose-prepped-deck';
import { Deck } from '~src/components/fast50/deck/deck';
import styles from '~src/components/fast50/deck/fast50.module.scss';
import {
    CUSTOM_SLIDE_COMPONENTS,
    SLIDE_COMPONENTS,
} from '~src/components/fast50/slides/slide-registry';
import { FIXTURES, fixturePost, fixturePrep } from '~src/lib/fast50/fixtures';

export const metadata = {
    robots: { index: false, follow: false },
};

const FIXTURE_IDS = ['grinder', 'prodigy', 'sparse'] as const;
type FixtureId = (typeof FIXTURE_IDS)[number];

const isFixtureId = (v: string | undefined): v is FixtureId =>
    !!v && (FIXTURE_IDS as readonly string[]).includes(v);

export default async function DemoPage({
    searchParams,
}: {
    searchParams: Promise<{ fixture?: string; deck?: string; prep?: string }>;
}) {
    const {
        fixture: fixtureParam,
        deck: deckParam,
        prep: prepParam,
    } = await searchParams;
    const fixture: FixtureId = isFixtureId(fixtureParam)
        ? fixtureParam
        : 'grinder';
    const deck = deckParam === 'post' ? 'post' : 'pre';
    const prep = prepParam === 'full' ? fixturePrep : null;
    const dossier = (deck === 'post' ? fixturePost : FIXTURES)[fixture];
    const { slides } = composePreppedDeck(dossier, prep);
    const prepQuery = prep ? '&prep=full' : '';

    return (
        <>
            <Deck
                key={`${fixture}-${deck}-${prepParam ?? 'off'}`}
                dossier={dossier}
                slides={slides}
                prep={prep}
                components={SLIDE_COMPONENTS}
                customComponents={CUSTOM_SLIDE_COMPONENTS}
            />
            <div className={styles.demoSwitcher}>
                {FIXTURE_IDS.map((id) => (
                    <Link
                        key={id}
                        href={`/fast50/screen/demo?fixture=${id}&deck=${deck}${prepQuery}`}
                        data-active={id === fixture || undefined}
                    >
                        {id}
                    </Link>
                ))}
                <span className={styles.demoDivider} />
                <Link
                    href={`/fast50/screen/demo?fixture=${fixture}&deck=pre${prepQuery}`}
                    data-active={deck === 'pre' || undefined}
                >
                    pre
                </Link>
                <Link
                    href={`/fast50/screen/demo?fixture=${fixture}&deck=post${prepQuery}`}
                    data-active={deck === 'post' || undefined}
                >
                    post
                </Link>
                <span className={styles.demoDivider} />
                <Link
                    href={`/fast50/screen/demo?fixture=${fixture}&deck=${deck}`}
                    data-active={!prep || undefined}
                >
                    no prep
                </Link>
                <Link
                    href={`/fast50/screen/demo?fixture=${fixture}&deck=${deck}&prep=full`}
                    data-active={!!prep || undefined}
                >
                    prep
                </Link>
            </div>
        </>
    );
}
