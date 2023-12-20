import { useState } from "react";
import { Col, Row } from "react-bootstrap";
import { getFormattedString } from "../util/datetime";
import styles from "../css/Search.module.scss";
import { safeEncodeURI } from "~src/utils/uri";
import { Search as SearchIcon } from "react-bootstrap-icons";

// This page was one of the first I ever wrote for the site and is fully outdated and terrible.
// The entire search view needs to be refactored
//TODO:: FIX
export const AutoCompletion = () => {
    const [filteredSuggestions, setFilteredSuggestions] = useState({
        users: {},
        games: {},
        categories: {},
    });
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    let suggestions = { users: {}, games: {}, categories: {} };

    const onChange = async (e) => {
        e.preventDefault();
        const userInput = e.target.value;
        setInput(userInput);

        if (!userInput || userInput.length < 2) {
            setFilteredSuggestions({ users: {}, games: {}, categories: {} });
            return;
        }

        // TODO:: Only search after user has not input anything for some time (300ms or something)
        setLoading(true);
        suggestions = await (await fetch(`/api/search?q=${userInput}`)).json();
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

    const Results = ({ results, type }) => {
        return (
            <>
                {Object.keys(results)
                    .slice(0, 5)
                    .map((result) => {
                        return transformResult(
                            type,
                            result,
                            results[result][0],
                        );
                    })
                    .filter((result) => !!result)}
            </>
        );
    };

    const transformResult = (type: string, result: string, results: any) => {
        if (type == "runs") {
            const split = result.split("//");

            if (split.length !== 3) return null;

            const pb = results.pbgt ? results.pbgt : results.pb;

            const username = split[0];
            const game = split[1];
            const category = split[2];
            let value = `${game} - ${category} by ${username} in ${getFormattedString(
                pb,
            )}`;
            if (results.pbgt) value += " (IGT)";
            const url = `/${username}/${safeEncodeURI(game)}/${safeEncodeURI(
                category,
            )}`;
            return (
                <li key={value}>
                    <a key={value} href={url} title={value}>
                        {value}
                    </a>
                </li>
            );
        }

        const url = type == "users" ? `/${result}` : `/games/${result}`;
        return (
            <li key={result}>
                <a key={result} href={url} title={result}>
                    {result}
                </a>
            </li>
        );
    };

    const Suggestions = () => {
        return (
            <>
                <Row>
                    <Col md={6}>
                        <div className="fs-x-large">Users</div>
                        <ul className="m-0 list-unstyled">
                            <Results
                                results={filteredSuggestions.users}
                                type={"users"}
                            />
                        </ul>
                    </Col>
                    <Col md={6} className={`${styles.suggestionLeft}`}>
                        <div className="fs-x-large">Games</div>
                        <ul className="m-0 list-unstyled">
                            <Results
                                results={filteredSuggestions.games}
                                type={"games"}
                            />
                        </ul>
                    </Col>
                </Row>
                <hr style={{ color: "var(--bs-link-color)" }} />
                <Row>
                    <Col>
                        <div className="fs-x-large">Runs</div>
                        <ul className="m-0 list-unstyled">
                            <Results
                                results={filteredSuggestions.categories}
                                type={"runs"}
                            />
                        </ul>
                    </Col>
                </Row>
            </>
        );
    };

    const SuggestionsListComponent = () => {
        let hasSuggestions =
            filteredSuggestions && Object.keys(filteredSuggestions).length > 0;

        if (!hasSuggestions) return <></>;

        if (hasSuggestions) {
            hasSuggestions =
                Object.values(filteredSuggestions).filter((obj) => {
                    return Object.keys(obj).length > 0;
                }).length > 0;
        }

        return (
            <div
                className={`dropdown-menu d-block text-center p-3 ${styles.suggestions}`}
                id="suggestions"
            >
                {hasSuggestions ? (
                    Suggestions()
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
        <div
            className="dropdown"
            tabIndex={-1}
            onKeyDown={(e) => {
                if (e.code === "Escape") {
                    setShowSuggestions(false);
                }
            }}
        >
            <div className="input-group">
                <span
                    className="input-group-text"
                    onClick={() => {
                        const search = document.getElementById("searchBox");
                        if (document.activeElement !== search) {
                            search.focus();
                        }
                    }}
                >
                    <SearchIcon size={18} />
                </span>
                <input
                    type="search"
                    className="form-control"
                    placeholder="Find a User or Game"
                    onChange={async (e) => await onChange(e)}
                    onKeyDown={onKeyDown}
                    value={input}
                    id="searchBox"
                />
            </div>
            {showSuggestions && input && filteredSuggestions && (
                <SuggestionsListComponent />
            )}
        </div>
    );
};
