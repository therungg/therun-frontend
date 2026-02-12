import type { EntityTab, Filters, Metric } from './types';

function getAggregateParams(
    tab: EntityTab,
    metric: Metric,
): { aggregate: string; aggregateColumn?: string; groupBy: string } {
    const groupBy =
        tab === 'games'
            ? 'game'
            : tab === 'categories'
              ? 'category'
              : 'username';

    if (metric === 'runner-count') {
        return { aggregate: 'count', groupBy };
    }

    const columnMap: Record<Exclude<Metric, 'runner-count'>, string> = {
        playtime: 'total_run_time',
        attempts: 'attempt_count',
        'finished-attempts': 'finished_attempt_count',
    };

    return {
        aggregate: 'sum',
        aggregateColumn: columnMap[metric],
        groupBy,
    };
}

export function buildQueryUrl(tab: EntityTab, filters: Filters): string {
    const isFinishedRuns = tab === 'finished-runs';
    const base = isFinishedRuns ? '/api/data/finished-runs' : '/api/data/runs';
    const params = new URLSearchParams();

    // Common filters
    if (filters.game) params.set('game', filters.game);
    if (filters.category) params.set('category', filters.category);
    if (filters.username) params.set('username', filters.username);
    if (filters.minPlaytime) params.set('min_playtime', filters.minPlaytime);
    if (filters.minAttempts) params.set('min_attempts', filters.minAttempts);
    if (filters.afterDate)
        params.set('after_date', new Date(filters.afterDate).toISOString());
    if (filters.beforeDate)
        params.set('before_date', new Date(filters.beforeDate).toISOString());

    // Finished runs only filters
    if (isFinishedRuns) {
        if (filters.isPb) params.set('is_pb', filters.isPb);
        if (filters.topGames) params.set('top_games', filters.topGames);
        if (filters.topCategories)
            params.set('top_categories', filters.topCategories);
    }

    // Aggregation for entity tabs (games/categories/users)
    if (tab === 'games' || tab === 'categories' || tab === 'users') {
        const { aggregate, aggregateColumn, groupBy } = getAggregateParams(
            tab,
            filters.metric,
        );
        params.set('aggregate', aggregate);
        if (aggregateColumn) params.set('aggregate_column', aggregateColumn);
        params.set('group_by', groupBy);
    }

    if (filters.limit) params.set('limit', filters.limit);

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}
