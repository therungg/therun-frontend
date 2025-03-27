import * as dotenv from "dotenv";
import { getAlgoliaApiClient } from "./algolia";

dotenv.config({ path: "./.env.development" });

const main = async () => {
    const indexName = process.env
        .NEXT_PUBLIC_ALGOLIA_EVENTS_INDEX_NAME as string;
    const client = await getAlgoliaApiClient();

    await client.setSettings({
        indexName,
        indexSettings: {
            searchableAttributes: ["name", "organizer", "tags"],
            typoTolerance: true,
            minWordSizefor1Typo: 3,
            minWordSizefor2Typos: 6,
            allowTyposOnNumericTokens: false,
            ignorePlurals: true,
            attributesForFaceting: [
                "organizer",
                "type",
                "location",
                "language",
                "tier",
            ],
            maxValuesPerFacet: 100,
            sortFacetValuesBy: "count",
            maxFacetHits: 10,
            hitsPerPage: 10,
            paginationLimitedTo: 20,
        },
        forwardToReplicas: true,
    });
};

main();
