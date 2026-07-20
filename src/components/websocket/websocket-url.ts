// Builds the live websocket url. With a game the backend subscribes the
// connection to that game's bucket (optionally narrowed by category) instead
// of the sitewide 'all' firehose; without one it stays on the firehose.
export const buildLiveWebsocketUrl = (
    baseUrl: string,
    game?: string | null,
    category?: string | null,
): string => {
    if (!game) return baseUrl;

    let url = `${baseUrl}?game=${encodeURIComponent(game)}`;

    if (category) {
        url += `&category=${encodeURIComponent(category)}`;
    }

    return url;
};
