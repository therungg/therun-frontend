import React from "react";
import { FuseResultMatch } from "fuse.js";

interface FuzzyMatchHighlightProps {
    result: string;
    highlights: FuseResultMatch[];
}

export const FuzzyMatchHighlight: React.FunctionComponent<
    FuzzyMatchHighlightProps
> = ({ result, highlights }) => {
    const highlightIndices = React.useMemo(
        () =>
            highlights.reduce(
                (result, match) => {
                    if (match.indices?.length) {
                        match.indices.forEach(([start, end]) => {
                            // end + 1 because end is inclusive in Fuse.js indices
                            result.push({ start, end: end + 1 });
                        });
                    }

                    return result;
                },
                [] as { start: number; end: number }[],
            ),
        [highlights],
    );

    const parts = React.useMemo(() => {
        return result.split("").reduce((results, character, index) => {
            const isHighlighted = highlightIndices.some(
                ({ start, end }) => index >= start && index < end,
            );
            if (isHighlighted) {
                const highlightedCharacter = (
                    <HighlightCharacter
                        key={`highlight-${index}-${character}`}
                        character={character}
                    />
                );

                results.push(highlightedCharacter);
            } else {
                results.push(character);
            }

            return results;
        }, [] as React.ReactNode[]);
    }, [highlightIndices, result]);

    return <>{parts}</>;
};

const HighlightCharacter = ({
    key,
    character,
}: {
    key: string;
    character: string;
}) => (
    <span key={key} className="text-primary">
        {character}
    </span>
);
