import styles from '../../styles/shared/content-page.module.scss';

export interface LegalSection {
    id: string;
    title: string;
    sub?: { id: string; title: string }[];
}

export function LegalToc({ sections }: { sections: LegalSection[] }) {
    return (
        <nav className={styles.toc} aria-label="Contents">
            <p className={styles.tocTitle} aria-hidden="true">
                Contents
            </p>
            <ol>
                {sections.map((s) => (
                    <li key={s.id}>
                        <a href={`#${s.id}`}>{s.title}</a>
                        {s.sub && (
                            <ul>
                                {s.sub.map((c) => (
                                    <li key={c.id}>
                                        <a href={`#${c.id}`}>{c.title}</a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
