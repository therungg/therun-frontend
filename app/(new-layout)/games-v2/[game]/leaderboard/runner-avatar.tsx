import { nameHue } from './avatar-hue';
import styles from './leaderboard.module.scss';

interface Props {
    name: string;
    size?: 'sm' | 'md';
}

function initials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`;
    return name.slice(0, 2);
}

export function RunnerAvatar({ name, size = 'sm' }: Props) {
    return (
        <span
            aria-hidden
            className={size === 'md' ? styles.avatarMd : styles.avatar}
            style={{ backgroundColor: `hsl(${nameHue(name)} 32% 42%)` }}
        >
            {initials(name)}
        </span>
    );
}
