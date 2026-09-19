'use client';

import styles from '~src/components/console-chrome/console.module.scss';
import {
    WORKSPACE_KIND_LABEL,
    workspaceScreen,
} from '~src/lib/setup/workspace';
import {
    WorkspaceScreen,
    type WorkspaceScreenProps,
} from '../../setup/workspace/workspace-screen';

/** A console page for one workspace screen — the wizard's screen, framed as
 *  a pane. */
export function WorkspacePane(props: WorkspaceScreenProps) {
    const screen = workspaceScreen(props.kind, props.sub);
    if (!screen) return null;
    return (
        <section className={styles.surface}>
            <header className={styles.paneHeader}>
                <div>
                    <div className={styles.paneEyebrow}>
                        {WORKSPACE_KIND_LABEL[props.kind]}
                    </div>
                    <h2 className={styles.paneTitle}>{screen.title}</h2>
                </div>
            </header>
            <WorkspaceScreen {...props} tableFirst />
        </section>
    );
}
