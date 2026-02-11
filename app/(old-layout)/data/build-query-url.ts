interface QueryFilters {
    dataSource: string;
    game: string;
    category: string;
    username: string;
    afterDate: string;
    beforeDate: string;
    isPb: string;
    minAttempts: string;
    maxAttempts: string;
    topGames: string;
    topCategories: string;
    aggregate: string;
    aggregateColumn: string;
    groupBy: string;
    limit: string;
    sort: string;
}

export function buildQueryUrl(filters: QueryFilters): string {
    const base =
        filters.dataSource === 'finished-runs'
            ? '/api/data/finished-runs'
            : '/api/data/runs';
    const params = new URLSearchParams();

    if (filters.game) params.set('game', filters.game);
    if (filters.category) params.set('category', filters.category);
    if (filters.username) params.set('username', filters.username);
    if (filters.afterDate)
        params.set('after_date', new Date(filters.afterDate).toISOString());
    if (filters.beforeDate)
        params.set('before_date', new Date(filters.beforeDate).toISOString());
    if (filters.minAttempts) params.set('min_attempts', filters.minAttempts);
    if (filters.maxAttempts) params.set('max_attempts', filters.maxAttempts);

    // finished-runs only params
    if (filters.dataSource === 'finished-runs') {
        if (filters.isPb) params.set('is_pb', filters.isPb);
        if (filters.topGames) params.set('top_games', filters.topGames);
        if (filters.topCategories)
            params.set('top_categories', filters.topCategories);
    }

    // aggregate params
    if (filters.aggregate && filters.aggregate !== 'none') {
        params.set('aggregate', filters.aggregate);
        if (filters.groupBy) params.set('group_by', filters.groupBy);
        if (
            (filters.aggregate === 'sum' || filters.aggregate === 'avg') &&
            filters.aggregateColumn
        ) {
            params.set('aggregate_column', filters.aggregateColumn);
        }
    }

    if (filters.limit) params.set('limit', filters.limit);
    if (filters.sort) params.set('sort', filters.sort);

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}
