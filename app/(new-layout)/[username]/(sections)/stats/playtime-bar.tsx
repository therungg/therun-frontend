import { GameImage } from '~src/components/image/gameimage';
import type { RunnerStatsGame } from '../../../../../types/runner-profile.types';
import { formatHours } from '../format';
import ui from '../profile-ui.module.scss';
import styles from './stats.module.scss';

const SHOWN = 6;

/** Playtime per game as one bar, the biggest games named, the rest as "Other". */
export function PlaytimeBar({
    games,
    total,
}: {
    games: RunnerStatsGame[];
    total: number;
}) {
    if (total <= 0) return null;
    const top = games.slice(0, SHOWN);
    const rest = games.slice(SHOWN).reduce((s, g) => s + g.playtimeMs, 0);
    const parts = [
        ...top.map((g, i) => ({
            key: String(g.gameId),
            label: g.game,
            imageUrl: g.imageUrl,
            ms: g.playtimeMs,
            tone: i,
        })),
        ...(rest > 0
            ? [
                  {
                      key: 'other',
                      label: `${games.length - SHOWN} other games`,
                      imageUrl: null,
                      ms: rest,
                      tone: -1,
                  },
              ]
            : []),
    ];
    const pct = (ms: number) => (ms / total) * 100;

    return (
        <div className={ui.card}>
            <div
                className={styles.bar}
                role="img"
                aria-label="Playtime per game"
            >
                {parts.map((p) => (
                    <span
                        key={p.key}
                        className={styles.barPart}
                        data-tone={p.tone}
                        style={{ flexGrow: p.ms }}
                        title={`${p.label}: ${formatHours(p.ms)}`}
                    />
                ))}
            </div>
            <ul className={styles.legend}>
                {parts.map((p) => (
                    <li key={p.key}>
                        <span className={styles.swatch} data-tone={p.tone} />
                        {p.imageUrl ? (
                            <GameImage
                                src={p.imageUrl}
                                alt=""
                                quality="small"
                                width={15}
                                height={20}
                            />
                        ) : null}
                        <span className={styles.legendName}>{p.label}</span>
                        <span className={styles.legendValue}>
                            {formatHours(p.ms)}
                            <span className={ui.faint}>
                                {' '}
                                · {Math.max(1, Math.round(pct(p.ms)))}%
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
