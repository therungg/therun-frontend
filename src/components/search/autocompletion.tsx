import { ChangeEventHandler, ReactNode, useState } from "react";
import { getFormattedString } from "../util/datetime";
import { Search as SearchIcon } from "react-bootstrap-icons";
import Link from "next/link";

interface SearchSuggestionUser {
    user: string;
    game: string;
    run: string;
    pb: string;
    pbgt: string;
}

interface SearchSuggestions {
    users: {
        [key: string]: SearchSuggestionUser[];
    };
    games: { [key: string]: SearchSuggestionUser[] };
    categories: { [key: string]: SearchSuggestionUser[] };
}

// This page was one of the first I ever wrote for the site and is fully outdated and terrible.
// The entire search view needs to be refactored
//TODO:: FIX
export const AutoCompletion = () => {
    const [filteredSuggestions, setFilteredSuggestions] =
        useState<SearchSuggestions>({
            users: {},
            games: {},
            categories: {},
        });
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const onChange: ChangeEventHandler<HTMLInputElement> = async (e) => {
        e.preventDefault();
        const userInput = e.target.value;
        setInput(userInput);

        if (!userInput || userInput.length < 2) {
            setFilteredSuggestions({ users: {}, games: {}, categories: {} });
            return;
        }

        // TODO:: Only search after user has not input anything for some time (300ms or something)
        setLoading(true);
        const suggestions = (await (
            await fetch(`/api/search?q=${userInput}`)
        ).json()) as unknown as SearchSuggestions;
        setLoading(false);

        setFilteredSuggestions(suggestions);
        setActiveSuggestionIndex(0);
        setShowSuggestions(true);
    };

    const onKeyDown = (e) => {
        // User pressed the enter key
        if (e.keyCode === 13) {
            setInput(filteredSuggestions.user[0]);
            setActiveSuggestionIndex(0);
            setShowSuggestions(false);
        }
        // User pressed the up arrow
        else if (e.keyCode === 38) {
            if (activeSuggestionIndex === 0) {
                return;
            }

            setActiveSuggestionIndex(activeSuggestionIndex - 1);
        }
        // User pressed the down arrow
        else if (e.keyCode === 40) {
            if (activeSuggestionIndex - 1 === filteredSuggestions.length) {
                return;
            }

            setActiveSuggestionIndex(activeSuggestionIndex + 1);
        }
    };

    const SuggestionListComponent = ({
        label,
        suggestions,
        slugBuilder,
        labelBuilder,
    }: {
        label: string;
        suggestions: { [key: string]: SearchSuggestionUser[] };
        // eslint-disable-next-line no-unused-vars
        slugBuilder: (key: string, value: SearchSuggestionUser[]) => string;
        // eslint-disable-next-line no-unused-vars
        labelBuilder: (key: string, value: SearchSuggestionUser[]) => ReactNode;
    }) => {
        return (
            <div className={"tw-flex tw-flex-col tw-gap-2"}>
                <span className="tw-text-lg tw-font-bold">{label}</span>
                <>
                    {Object.entries(suggestions).map(([key, value]) => (
                        <Link
                            href={slugBuilder(key, value)}
                            key={key}
                            className={
                                "tw-border-b tw-border-transparent hover:tw-border-b hover:tw-border-b-therun-green"
                            }
                        >
                            {labelBuilder(key, value)}
                        </Link>
                    ))}
                </>
            </div>
        );
    };

    const SuggestionResultComponent = ({
        suggestions,
    }: {
        suggestions: SearchSuggestions;
    }) => {
        let hasSuggestions = Object.keys(suggestions).length > 0;

        if (!hasSuggestions) return <></>;

        if (hasSuggestions) {
            hasSuggestions =
                Object.values(filteredSuggestions).filter((obj) => {
                    return Object.keys(obj).length > 0;
                }).length > 0;
        }

        return (
            <div className="tw-bg-gray-100 tw-p-5 tw-rounded-b lg:tw-absolute">
                {hasSuggestions ? (
                    <>
                        <div className="tw-flex tw-flex-col tw-gap-8">
                            <SuggestionListComponent
                                label={"Users"}
                                suggestions={suggestions.users}
                                slugBuilder={(key) => `/${key}`}
                                labelBuilder={(key) => key}
                            />
                            <SuggestionListComponent
                                label={"Games"}
                                suggestions={suggestions.games}
                                slugBuilder={(gameName) => `/games/${gameName}`}
                                labelBuilder={(key) => key}
                            />
                            <SuggestionListComponent
                                label={"Categories"}
                                suggestions={suggestions.categories}
                                slugBuilder={(key) => `/${key}`}
                                labelBuilder={(key, value) => {
                                    const [, ...runName] =
                                        value[0].run.split("//");
                                    return (
                                        <span>
                                            <span
                                                className={"tw-font-semibold"}
                                            >
                                                {runName.join(" / ")}
                                            </span>{" "}
                                            by {value[0].user} in{" "}
                                            <span className={"tw-font-bold"}>
                                                {getFormattedString(
                                                    value[0].pb
                                                )}
                                            </span>
                                        </span>
                                    );
                                }}
                            />
                        </div>
                    </>
                ) : (
                    <ul className="m-0 list-unstyled">
                        <li>
                            {input.length < 2
                                ? "Please input at least 2 characters"
                                : !loading
                                ? `No results for ${input}`
                                : "Loading..."}
                        </li>
                    </ul>
                )}
            </div>
        );
    };

    return (
        <div>
            <form
                // onChange={onChange}
                className={
                    "tw-flex tw-flex-row tw-items-center tw-border tw-rounded-t tw-pl-2 tw-gap-4 "
                }
            >
                <label htmlFor={"searchBox"} className="">
                    <SearchIcon size={18} />
                </label>
                <input
                    type="search"
                    className="tw-flex-grow tw-py-2 tw-pl-2"
                    placeholder="Find a User or Game"
                    onChange={async (e) => await onChange(e)}
                    onKeyDown={onKeyDown}
                    value={input}
                    id="searchBox"
                />
            </form>
            {showSuggestions && input && filteredSuggestions && (
                <SuggestionResultComponent suggestions={filteredSuggestions} />
            )}
        </div>
    );
};
