'use client';

import { useSearchParams } from 'next/navigation';
import { setupStepMeta } from '~src/lib/setup/steps';
import {
    WORKSPACE_KIND_LABEL,
    type WorkspaceKind,
    type WorkspaceSubId,
    workspaceScreen,
    workspaceScreens,
} from '~src/lib/setup/workspace';
import styles from '../setup.module.scss';
import type { WizardData } from '../types';
import { WorkspaceScreen } from '../workspace/workspace-screen';

interface Props {
    data: WizardData;
    kind: WorkspaceKind;
    sub: WorkspaceSubId;
    onSelectSub: (sub: WorkspaceSubId) => void;
}

/**
 * Steps 4 and 5: one screen at a time, with tabs for the others. The shell's
 * footer walks the same screens with Next; nothing here saves, because every
 * screen writes as it is edited.
 */
export function StepWorkspace({ data, kind, sub, onSelectSub }: Props) {
    const params = useSearchParams();
    const catId = Number(params.get('cat')) || null;
    const screens = workspaceScreens(kind);
    const screen = workspaceScreen(kind, sub) ?? screens[0];

    return (
        <section>
            <header className={styles.stepHeader}>
                <span className={styles.eyebrow}>
                    Step {setupStepMeta(kind).num} ·{' '}
                    {WORKSPACE_KIND_LABEL[kind]}
                </span>
                <h2 className={styles.stepTitle}>{screen.title}</h2>
                <p className={styles.stepLede}>{screen.lede}</p>
            </header>

            <nav
                className={styles.subTabs}
                aria-label={`${WORKSPACE_KIND_LABEL[kind]} screens`}
            >
                {screens.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        className={`${styles.subTab} ${
                            s.id === screen.id ? styles.subTabActive : ''
                        }`}
                        aria-current={s.id === screen.id ? 'page' : undefined}
                        onClick={() => onSelectSub(s.id)}
                    >
                        {s.label}
                    </button>
                ))}
            </nav>

            <WorkspaceScreen
                kind={kind}
                sub={screen.id}
                game={data.game}
                categories={data.categories}
                groups={data.groups}
                variables={data.variables}
                policies={data.policies}
                metadata={data.metadata}
                initialOpenCategoryId={screen.id === 'settings' ? catId : null}
                onGoToList={() => onSelectSub('list')}
                onGoToSubcategories={() => onSelectSub('subcategories')}
                canEdit={data.canConfigure}
            />
        </section>
    );
}
