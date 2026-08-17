import { hasFlag } from 'country-flag-icons';
import { countries } from '~src/common/countries';
import styles from './user-hover-card.module.scss';

interface Props {
    country: string | null | undefined;
}

/**
 * A local twin of the leaderboard's CountryFlag. Same remote SVG source, so
 * the browser reuses the cached image, but styled from this card's own module:
 * importing the board's component would pull leaderboard.module.scss onto
 * every page that mentions a username, which is most of the site.
 */
export function CountryFlag({ country }: Props) {
    if (!country || !hasFlag(country)) return null;

    const name = (countries() as Record<string, string>)[country] ?? country;

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            className={styles.flag}
            alt={name}
            title={name}
            loading="lazy"
            src={`https://raw.githubusercontent.com/hampusborgos/country-flags/main/svg/${country.toLowerCase()}.svg`}
        />
    );
}
