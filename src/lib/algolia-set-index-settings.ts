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
            searchableAttributes: [
                "name",
                "organizer",
                "location",
                "language",
                "type",
                "tags",
            ],
            ranking: ["desc(startsAt)", "desc(tier)"],
            typoTolerance: true,
            minWordSizefor1Typo: 4,
            minWordSizefor2Typos: 7,
            allowTyposOnNumericTokens: false,
            ignorePlurals: true,
            attributesForFaceting: [
                "organizer",
                "type",
                "location",
                "language",
                "tier",
                "isOffline",
            ],
            numericAttributesForFiltering: [
                "startsAtTimeStamp",
                "endsAtTimeStamp",
            ],
            maxValuesPerFacet: 100,
            sortFacetValuesBy: "count",
            maxFacetHits: 10,
            hitsPerPage: 10,
            paginationLimitedTo: 1000,
        },
        forwardToReplicas: true,
    });
};

main();
