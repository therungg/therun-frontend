'use server';

import { algoliasearch, SearchResponse } from 'algoliasearch';
import { PaginatedData } from '~src/components/pagination/pagination.types';

const appID = process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID;
const apiKey = process.env.ALGOLIA_API_KEY;
const indexName = process.env.NEXT_PUBLIC_ALGOLIA_EVENTS_INDEX_NAME as string;

export const getAlgoliaApiClient = async () => {
    if (!appID || !apiKey || !indexName) {
        throw new Error('Algolia credentials not found');
    }

    return algoliasearch(appID, apiKey);
};

export async function searchAlgoliaEvents<T>(
    page = 1,
    search = '',
    filters = '',
) {
    const client = await getAlgoliaApiClient();
    const params = new URLSearchParams();

    params.set('facets', '*');
    params.set('page', (page - 1).toString());
    params.set('query', search);
    params.set('filters', filters);

    return client.searchSingleIndex<T>({
        indexName,
        searchParams: {
            params: params.toString(),
        },
    });
}

export async function algoliaSearchResponseToPaginationResponse<T>(
    searchResponse: SearchResponse<T>,
): Promise<PaginatedData<T>> {
    return {
        items: searchResponse.hits,
        totalItems: searchResponse.nbHits as number,
        totalPages: searchResponse.nbPages as number,
        pageSize: searchResponse.hitsPerPage as number,
        page: (searchResponse.page as number) + 1,
    };
}
