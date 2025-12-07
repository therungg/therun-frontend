import { Form, FormGroupProps } from "react-bootstrap";
import React, { useEffect, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import {
    Category,
    Game,
    PaginatedGameResult,
} from "~app/(old-layout)/games/games.types";
import styles from "~src/components/css/LiveRun.module.scss";
import { GameImage } from "~src/components/image/gameimage";

export const GameCategoryInput = (props: FormGroupProps) => {
    const [inputValue, setInputValue] = useState("");
    const [suggestions, setSuggestions] = useState<Game[]>([]);
    const [categorySuggestions, setCategorySuggesions] = useState<Category[]>(
        [],
    );
    const [categoryInput, setCategoryInput] = useState("");
    const [clickedGame, setClickedGame] = useState(false);
    const [clickedCategory, setClickedCategory] = useState(false);
    const [selectedGameImage, setSelectedGameImage] = useState("");

    const [search] = useDebounceValue(inputValue, 300);

    useEffect(() => {
        if (!clickedGame) {
            fetchSuggestions(search);
        }
    }, [search]);

    useEffect(() => {
        const foundCategory = categorySuggestions.find((category) => {
            return (
                category.category ===
                categoryInput.toLowerCase().replace(/\s/g, "")
            );
        });
        if (foundCategory) {
            setSuggestedCategory(foundCategory);
        }
    }, [categoryInput]);

    const fetchSuggestions = async (query: string) => {
        if (query.length < 3) {
            setSuggestions([]);
            return;
        }
        const response = await fetch(
            `/api/games?query=${encodeURIComponent(query)}&pageSize=3`,
        );
        const data = (await response.json()) as PaginatedGameResult;
        setSuggestions(data.items || []);
        const foundGame = data.items.find((game) => {
            return game.game === search.toLowerCase().replace(/\s/g, "");
        });
        if (foundGame) {
            setSuggestedGame(foundGame);
        } else {
            setClickedGame(false);
            setCategorySuggesions([]);
        }
    };

    const setSuggestedGame = (game: Game) => {
        setClickedGame(true);
        setInputValue(game.display);
        setCategorySuggesions(game.categories);
        setSelectedGameImage(game.image || "");
    };

    const setSuggestedCategory = (category: Category) => {
        setCategoryInput(category.display);
        setClickedCategory(true);
    };

    const unsetSuggestedGameCategory = () => {
        setClickedGame(false);
        setClickedCategory(false);
    };

    return (
        <div className="row g-3 mb-4 pe-0">
            {clickedGame && (
                <div className="col-md-6">
                    {!clickedCategory && <span>Game</span>}
                    <div
                        className={`d-flex mt-1 bg-body-secondary game-border rounded-3 p-0 ${styles.liveRunContainer}`}
                        style={{ height: "5rem" }}
                        onClick={() => {
                            unsetSuggestedGameCategory();
                        }}
                    >
                        <GameImage
                            src={selectedGameImage ? selectedGameImage : ""}
                            width={60}
                            height={50}
                            className="rounded-3"
                            quality="large"
                        />
                        <span style={{ height: "5rem" }} className="d-flex">
                            <div>
                                <span className="ps-3 h-100 align-items-center d-flex fs-6">
                                    <div>
                                        <span
                                            style={{
                                                color: "var(--bs-link-color)",
                                            }}
                                        >
                                            {inputValue}
                                        </span>
                                        {clickedCategory && (
                                            <div className="fst-italic">
                                                {categoryInput}
                                            </div>
                                        )}
                                    </div>
                                </span>
                            </div>
                        </span>
                    </div>
                </div>
            )}
            <Form.Group
                {...props}
                controlId="game"
                className={`col-md-6${clickedGame ? " d-none" : ""}`}
            >
                <Form.Label>Game</Form.Label>
                <Form.Control
                    autoComplete="off"
                    type="text"
                    placeholder="Enter Game"
                    value={inputValue}
                    onChange={(e) => {
                        setClickedGame(false);
                        setInputValue(e.target.value);
                    }}
                    name="game"
                />
                {!clickedGame && inputValue !== search && (
                    <span>Loading suggestions...</span>
                )}
                {!clickedGame && suggestions.length > 0 && (
                    <SuggestedGamesList
                        games={suggestions}
                        setGame={setSuggestedGame}
                    />
                )}
            </Form.Group>
            <Form.Group
                className={`col-md-6${clickedCategory ? " d-none" : ""}`}
                controlId="category"
            >
                <Form.Label>Category</Form.Label>
                <Form.Control
                    autoComplete="off"
                    name="category"
                    type="text"
                    placeholder="Enter Category"
                    value={categoryInput}
                    onChange={(e) => {
                        setClickedCategory(false);
                        setCategoryInput(e.target.value);
                    }}
                />
                {!clickedCategory && categorySuggestions.length > 0 && (
                    <SuggestedCategoryList
                        categories={categorySuggestions}
                        setCategory={setSuggestedCategory}
                    />
                )}
            </Form.Group>
        </div>
    );
};

const SuggestedGamesList = ({
    games,
    setGame,
}: {
    games: Game[];
    setGame: (game: Game) => void;
}) => {
    return (
        <div className="mt-2">
            <ul className="p-0">
                {games.map((game, index) => (
                    <li
                        key={index}
                        className={`d-flex mt-1 bg-body-secondary game-border ${styles.liveRunContainer} rounded-3`}
                        onClick={() => {
                            setGame(game);
                        }}
                    >
                        <span style={{ height: "5rem" }} className="d-flex">
                            <GameImage
                                src={
                                    game.image && game.image !== "noimage"
                                        ? game.image
                                        : ""
                                }
                                width={60}
                                height={50}
                                className="rounded-3"
                                quality="large"
                            />
                            <span
                                style={{ color: "var(--bs-link-color)" }}
                                className="ps-3 h-100 align-items-center d-flex fs-6"
                            >
                                {game.display}
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const SuggestedCategoryList = ({
    categories,
    setCategory,
}: {
    categories: Category[];
    setCategory: (category: Category) => void;
}) => {
    return (
        <div className="mt-2">
            <ul className="p-0">
                {categories.map((category, index) => (
                    <li
                        key={index}
                        className={`d-flex mt-1 px-3 py-1 bg-body-secondary game-border ${styles.liveRunContainer} rounded-3`}
                        onClick={() => {
                            setCategory(category);
                        }}
                    >
                        <span>{category.display}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
