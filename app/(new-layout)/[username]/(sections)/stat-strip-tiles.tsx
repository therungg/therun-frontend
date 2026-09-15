import styles from './profile-ui.module.scss';

export interface StripTile {
    value: string;
    label: string;
    medal?: string;
}

/** The strip's small numbers after the lead. */
export function TileList({ tiles }: { tiles: StripTile[] }) {
    if (tiles.length === 0) return null;
    return (
        <ul className={styles.tiles}>
            {tiles.map((t) => (
                <li key={t.label} data-medal={t.medal}>
                    <b>{t.value}</b>
                    <span>{t.label}</span>
                </li>
            ))}
        </ul>
    );
}
