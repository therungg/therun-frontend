const BASE_URL = 'https://therun.gg';

export function buildWebSiteJsonLd() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'The Run',
        url: BASE_URL,
        description:
            'Free speedrun statistics — live run tracking, leaderboards, personal bests, and race data for speedrunners.',
        potentialAction: {
            '@type': 'SearchAction',
            target: `${BASE_URL}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
        },
    };
}

export function buildPersonJsonLd({
    username,
    picture,
    description,
    socials,
}: {
    username: string;
    picture?: string;
    description: string;
    socials?: { youtube?: string; twitter?: string; twitch?: string };
}) {
    const sameAs: string[] = [];
    if (socials?.twitch) sameAs.push(`https://twitch.tv/${socials.twitch}`);
    if (socials?.youtube) sameAs.push(`https://youtube.com/${socials.youtube}`);
    if (socials?.twitter) sameAs.push(`https://twitter.com/${socials.twitter}`);

    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: username,
        url: `${BASE_URL}/${username}`,
        description,
        ...(picture ? { image: picture } : {}),
        ...(sameAs.length > 0 ? { sameAs } : {}),
    };
}

export function buildSportsEventJsonLd({
    username,
    game,
    category,
    personalBest,
}: {
    username: string;
    game: string;
    category: string;
    personalBest?: string;
}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: `${game} - ${category}`,
        url: `${BASE_URL}/${username}/${encodeURIComponent(game)}/${encodeURIComponent(category)}`,
        description: `${username} speedruns ${game} - ${category}${personalBest ? ` with a personal best of ${personalBest}` : ''}`,
        performer: {
            '@type': 'Person',
            name: username,
            url: `${BASE_URL}/${username}`,
        },
    };
}
