// speedrun.com deep links. Leaderboard data on speedrun.com is CC BY-NC 4.0,
// so imported runs and linked accounts credit the source with a link back.
// One place for the URL shape so a change on their side is a one-line fix.

export const SRC_RUN_URL = 'https://www.speedrun.com/run/';
export const SRC_USER_URL = 'https://www.speedrun.com/user/';

export const srcRunUrl = (srcRunId: string): string =>
    `${SRC_RUN_URL}${encodeURIComponent(srcRunId)}`;

export const srcUserUrl = (srcUsername: string): string =>
    `${SRC_USER_URL}${encodeURIComponent(srcUsername)}`;
