/**
 * The backend's own lookup key, mirrored exactly. `resolveGame` and
 * `resolveCategory` match `games_pg.name` / `categories.name` with
 * `eq()` against `convertToSearchable(param)`, which lowercases and strips
 * WHITESPACE ONLY — see therun-backend `src/common/convertToSearchable.ts`.
 *
 * Use this for every slug that goes out to the API. `normalizeSlug` also
 * strips hyphens, which is right for folding an inbound URL against
 * candidates we already hold in memory, but wrong on the wire: it turns
 * `All Bosses - Base Game - Glitched` into `allbossesbasegameglitched`
 * while the row is named `allbosses-basegame-glitched`, and the board 404s.
 * 5,819 categories and 747 games carry a hyphen in their name.
 *
 * The decode is as tolerant as the backend's: a name that contains a bare
 * `%` (`remastered-any%`) makes decodeURIComponent throw, and the raw value
 * is what the backend then matches on.
 */
export function searchable(subject: string): string {
    let decoded = subject;
    try {
        decoded = decodeURIComponent(subject);
    } catch {
        // Not valid percent-encoding: match on it as given, like the backend.
    }
    return decoded.toLowerCase().replace(/\s/g, '');
}
