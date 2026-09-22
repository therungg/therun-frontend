import { SUBMIT_PARAM } from '~src/lib/board-url';

/**
 * The board's own query params. Everything else on a board URL is a
 * subcategory or filter value — same split `GamePageSearchParams` makes.
 */
const BOARD_PARAMS = new Set([
    SUBMIT_PARAM,
    'category',
    'combined',
    'verified',
    'page',
    'pageSize',
    'view',
]);

export interface SubmitParams {
    open: boolean;
    categorySlug: string | null;
    subcategoryValues: Record<string, string>;
}

/**
 * Reads the submit dialog's state out of a board URL.
 *
 * Shared by every route that can render the dialog. It exists as one function
 * because the dialog is opened by a query param rather than a route: each page
 * that carries a "Submit a run" link has to both mount the dialog and read the
 * same param, and the first version of this feature shipped with the overview
 * page doing neither — the link changed the URL and nothing listened.
 */
export function parseSubmitParams(searchParams: URLSearchParams): SubmitParams {
    const subcategoryValues: Record<string, string> = {};
    for (const [key, value] of searchParams) {
        if (BOARD_PARAMS.has(key)) continue;
        if (value.length > 0) subcategoryValues[key] = value;
    }

    return {
        open: searchParams.get(SUBMIT_PARAM) === '1',
        categorySlug: searchParams.get('category'),
        subcategoryValues,
    };
}

/**
 * A server page's query string, rebuilt from its `searchParams` prop (a Server
 * Component can't read the request URL), for a `SubmitDialogProvider`'s
 * `initialSearch` so a `?submit=1` deep link opens the dialog on arrival.
 */
export function toInitialSearch(
    sp: Record<string, string | string[] | undefined>,
): string {
    return new URLSearchParams(
        Object.entries(sp).filter(
            (e): e is [string, string] => typeof e[1] === 'string',
        ),
    ).toString();
}
