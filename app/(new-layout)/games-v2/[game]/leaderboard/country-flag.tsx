import { hasFlag } from 'country-flag-icons';
import { countries } from '~src/common/countries';
import styles from './leaderboard.module.scss';

interface Props {
    country: string | null | undefined;
}

// Same remote SVG source as the profile page's CountryIcon; the browser
// caches one SVG per distinct country on the board.
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
