export type EntityTab =
    | 'games'
    | 'categories'
    | 'users'
    | 'user-runs'
    | 'finished-runs';

export type Metric =
    | 'playtime'
    | 'attempts'
    | 'finished-attempts'
    | 'runner-count';

export interface Filters {
    game: string;
    category: string;
    username: string;
    minPlaytime: string;
    minAttempts: string;
    afterDate: string;
    beforeDate: string;
    isPb: '' | 'true' | 'false';
    topGames: string;
    topCategories: string;
    metric: Metric;
    limit: string;
}

export const DEFAULT_FILTERS: Filters = {
    game: '',
    category: '',
    username: '',
    minPlaytime: '',
    minAttempts: '',
    afterDate: '',
    beforeDate: '',
    isPb: '',
    topGames: '',
    topCategories: '',
    metric: 'playtime',
    limit: '50',
};

export const ENTITY_TABS: { value: EntityTab; label: string }[] = [
    { value: 'games', label: 'Games' },
    { value: 'categories', label: 'Categories' },
    { value: 'users', label: 'Users' },
    { value: 'user-runs', label: 'User Runs' },
    { value: 'finished-runs', label: 'Finished Runs' },
];

export const TAB_FILTERS: Record<EntityTab, (keyof Filters)[]> = {
    games: ['minPlaytime', 'minAttempts', 'afterDate', 'beforeDate', 'metric'],
    categories: [
        'game',
        'minPlaytime',
        'minAttempts',
        'afterDate',
        'beforeDate',
        'metric',
    ],
    users: [
        'game',
        'category',
        'minPlaytime',
        'minAttempts',
        'afterDate',
        'beforeDate',
        'metric',
    ],
    'user-runs': ['username', 'game', 'category', 'minPlaytime', 'minAttempts'],
    'finished-runs': [
        'game',
        'category',
        'username',
        'isPb',
        'afterDate',
        'beforeDate',
        'topGames',
        'topCategories',
    ],
};

export const METRIC_OPTIONS: { value: Metric; label: string }[] = [
    { value: 'playtime', label: 'Total Playtime' },
    { value: 'attempts', label: 'Total Attempts' },
    { value: 'finished-attempts', label: 'Finished Attempts' },
    { value: 'runner-count', label: 'Runner Count' },
];

export const USER_METRIC_OPTIONS = METRIC_OPTIONS.filter(
    (m) => m.value !== 'runner-count',
);

export const AGGREGATED_TABS: EntityTab[] = ['games', 'categories', 'users'];

export function isAggregatedTab(tab: EntityTab): boolean {
    return AGGREGATED_TABS.includes(tab);
}
