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

/**
 * Formats a millisecond string into a human-readable duration.
 * Examples: "5025000" -> "1:23:45", "83000" -> "01:23", "3661000" -> "1:01:01"
 */
export function formatMillis(ms: string | undefined): string | undefined {
    if (!ms) return undefined;
    const milli = parseInt(ms);
    if (Number.isNaN(milli) || milli <= 0) return undefined;

    const totalSeconds = Math.floor(milli / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const millis = milli % 1000;

    const pad = (n: number) => String(n).padStart(2, '0');

    let time = '';
    if (hours > 0) {
        time = `${hours}:${pad(minutes)}:${pad(seconds)}`;
    } else {
        time = `${pad(minutes)}:${pad(seconds)}`;
    }

    if (millis > 0) {
        time += `.${String(millis).padStart(3, '0')}`;
    }

    return time;
}

/**
 * Formats a millisecond string into a human-readable total playtime.
 * Examples: "360000000" -> "100 hours", "7200000" -> "2 hours", "1800000" -> "30 minutes"
 */
export function formatPlaytime(ms: string | undefined): string | undefined {
    if (!ms) return undefined;
    const milli = parseInt(ms);
    if (Number.isNaN(milli) || milli <= 0) return undefined;

    const totalMinutes = Math.floor(milli / 60000);
    const hours = Math.floor(totalMinutes / 60);

    if (hours >= 1) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
}

interface RunProfileJsonLdInput {
    username: string;
    game: string;
    category: string;
    personalBest?: string;
    sumOfBests?: string;
    attemptCount?: number;
    finishedAttemptCount?: string;
    totalRunTime?: string;
}

export function buildRunProfileJsonLd({
    username,
    game,
    category,
    personalBest,
    sumOfBests,
    attemptCount,
    finishedAttemptCount,
    totalRunTime,
}: RunProfileJsonLdInput) {
    const pb = formatMillis(personalBest);
    const sob = formatMillis(sumOfBests);
    const playtime = formatPlaytime(totalRunTime);

    const descParts = [`${username} speedruns ${game} - ${category}`];
    if (pb) descParts.push(`PB: ${pb}`);
    if (sob) descParts.push(`Sum of best: ${sob}`);
    if (attemptCount) descParts.push(`${attemptCount} attempts`);
    if (playtime) descParts.push(`${playtime} played`);
    const description = descParts.join(' | ');

    return {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: `${username}'s ${game} - ${category} Speedruns`,
        url: `${BASE_URL}/${username}/${encodeURIComponent(game)}/${encodeURIComponent(category)}`,
        description,
        mainEntity: {
            '@type': 'Person',
            name: username,
            url: `${BASE_URL}/${username}`,
            knowsAbout: `${game} - ${category}`,
        },
    };
}
