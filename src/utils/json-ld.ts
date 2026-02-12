import { type EventWithOrganizerName } from '../../types/events.types';

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

export function buildEventJsonLd(event: EventWithOrganizerName) {
    const startsAt = new Date(event.startsAt).toISOString();
    const endsAt = new Date(event.endsAt).toISOString();

    const eventStatus = event.isDeleted
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled';

    const location = event.isOffline
        ? event.location
            ? {
                  '@type': 'Place' as const,
                  name: event.location,
              }
            : undefined
        : {
              '@type': 'VirtualLocation' as const,
              url: event.twitch
                  ? `https://twitch.tv/${event.twitch}`
                  : (event.url ?? `${BASE_URL}/events/${event.slug}`),
          };

    const eventAttendanceMode = event.isOffline
        ? 'https://schema.org/OfflineEventAttendanceMode'
        : 'https://schema.org/OnlineEventAttendanceMode';

    return {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.name,
        url: `${BASE_URL}/events/${event.slug}`,
        description: event.shortDescription || event.name,
        startDate: startsAt,
        endDate: endsAt,
        eventStatus,
        eventAttendanceMode,
        ...(location ? { location } : {}),
        ...(event.imageUrl ? { image: event.imageUrl } : {}),
        organizer: {
            '@type': 'Organization',
            name: event.organizerName,
        },
        ...(event.submissionsUrl
            ? {
                  offers: {
                      '@type': 'Offer',
                      url: event.submissionsUrl,
                      price: '0',
                      priceCurrency: 'USD',
                      availability: 'https://schema.org/InStock',
                  },
              }
            : {}),
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
