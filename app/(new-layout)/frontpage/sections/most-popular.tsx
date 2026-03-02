import Image from 'next/image';
import Link from 'next/link';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { type GameWithImage, getTopGames } from '~src/lib/highlights';
import { safeEncodeURI } from '~src/utils/uri';
import styles from './most-popular.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

export const MostPopularSection = async () => {
    const games = await getTopGames(5);

    return (
        <Panel
            panelId="popular"
            title="Most Popular"
            subtitle="All Time"
            className="p-0 overflow-hidden"
        >
            <div className={styles.content}>
                <div className={styles.games}>
                    {games.map((game, i) => (
                        <PopularGameRow
                            key={game.gameId}
                            game={game}
                            rank={i + 1}
                        />
                    ))}
                </div>
            </div>
        </Panel>
    );
};

const PopularGameRow = ({
    game,
    rank,
}: {
    game: GameWithImage;
    rank: number;
}) => {
    const imageUrl =
        game.gameImage && game.gameImage !== 'noimage'
            ? game.gameImage
            : FALLBACK_IMAGE;

    const hours = Math.round(game.totalRunTime / 3_600_000).toLocaleString();

    return (
        <Link
            href={`/${safeEncodeURI(game.gameDisplay)}`}
            className={styles.row}
        >
            <span className={styles.rank}>{rank}</span>
            <Image
                src={imageUrl}
                alt=""
                width={30}
                height={40}
                className={styles.art}
                unoptimized
            />
            <span className={styles.name}>{game.gameDisplay}</span>
            <span className={styles.hours}>{hours}h</span>
        </Link>
    );
};
