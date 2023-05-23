import { GetServerSideProps } from "next";
import { getTabulatedGameStatsPopular } from "../components/game/get-tabulated-game-stats";
import { Button, Card, Col, Image, Row } from "react-bootstrap";
import { Title } from "../components/title";
import { DurationToFormatted } from "../components/util/datetime";
import { UserLink } from "../components/links/links";
import { Key, useEffect, useState } from "react";
import styles from "../components/css/Games.module.scss";
import searchStyles from "../components/css/Search.module.scss";
import homeStyles from "../components/css/Home.module.scss";
import useSWR from "swr";
import { fetcher } from "../utils/fetcher";

export interface Game {
    game: string;
    sort: number;
    categories: Category[];
    display: string;
    image?: string;
}

interface Category {
    bestTimeUser: string;
    bestTime: string;
    category: string;
    totalRunTime: number;
    display: string;
    gameTime?: boolean;
    gameTimePb?: string | null;
    bestGameTimeUser?: string | null;
}

export const Games = ({ initGames }: { initGames: Game[] }) => {
    const [search, setSearch] = useState("");
    const [count, setCount] = useState(10);
    const [sort, setSort] = useState("hours-asc");
    const [dark, setDark] = useState(true);

    let games = initGames;
    const { data } = useSWR("/api/games", fetcher);

    if (data) games = data;

    useEffect(function () {
        setDark(document.documentElement.dataset.theme !== "light");
    }, []);

    games.sort((a, b) => {
        if (sort === "hours-asc") {
            return a.sort > b.sort ? -1 : 1;
        }
        if (sort === "name-asc") {
            return a.display.toLowerCase() > b.display.toLowerCase() ? 1 : -1;
        }
        if (sort === "name-desc") {
            return a.display.toLowerCase() < b.display.toLowerCase() ? 1 : -1;
        }
    });

    //Ugly search, needs to be serverside probably
    games = games.filter((game: Game) => {
        const lowerSearch = search.toLowerCase();
        if (game.display.toLowerCase().includes(lowerSearch)) return true;
        if (game.game.includes(lowerSearch)) return true;

        for (const category of game.categories) {
            if (category.display.toLowerCase().includes(lowerSearch))
                return true;
            if (category.category.includes(lowerSearch)) return true;
            if (category.bestTimeUser.toLowerCase().includes(lowerSearch))
                return true;
            if (category.bestGameTimeUser?.toLowerCase().includes(lowerSearch))
                return true;
        }
        return false;
    });

    const sliced = games.slice(0, count);

    return (
        <div>
            <Title>Games</Title>

            <div>
                <div
                    className={`${searchStyles.searchContainer} ${styles.filter}`}
                >
                    <span
                        className={"material-symbols-outlined"}
                        onClick={() => {
                            const searchElement =
                                document.getElementById("gameSearch");
                            if (document.activeElement !== searchElement) {
                                searchElement.focus();
                            }
                        }}
                    >
                        {" "}
                        search{" "}
                    </span>
                    <input
                        type="search"
                        className={`form-control ${searchStyles.search}`}
                        placeholder="Filter by game/category/user"
                        style={{ marginBottom: "0" }}
                        onChange={(e) => {
                            setSearch(e.target.value);
                        }}
                        value={search}
                        id="gameSearch"
                    />
                </div>
            </div>
            <div>
                <div
                    className={`${searchStyles.searchContainer} ${styles.filter}`}
                >
                    <span
                        className={"material-symbols-outlined"}
                        onClick={() => {
                            const searchElement =
                                document.getElementById("sort");
                            if (document.activeElement !== searchElement) {
                                searchElement.focus();
                            }
                        }}
                    >
                        {" "}
                        sort{" "}
                    </span>
                    <select
                        className={`form-control ${searchStyles.select}`}
                        onChange={(e) => {
                            setSort(e.target.value);
                        }}
                        value={sort}
                        id="sort"
                    >
                        <option id={"hours-asc"} value={"hours-asc"}>
                            Total playtime
                        </option>
                        <option id={"name-asc"} value={"name-asc"}>
                            Name (Ascending)
                        </option>
                        <option id={"name-desc"} value={"name-desc"}>
                            Name (Descending)
                        </option>
                    </select>
                </div>
            </div>

            <Row>
                {sliced.map((game: Game) => {
                    const gameUrl = encodeURIComponent(game.display);

                    return (
                        <Col xl={6} lg={12} key={game.game}>
                            <div className={styles.image}>
                                <a href={`/game/${gameUrl}`}>
                                    {game.image && game.image != "noimage" && (
                                        <Image
                                            alt={"Game Image"}
                                            src={game.image}
                                            height={142}
                                            width={106}
                                        />
                                    )}
                                    {(!game.image ||
                                        game.image == "noimage") && (
                                        <div className={styles.backupImage}>
                                            <Image
                                                alt={"Game Image"}
                                                src={
                                                    dark
                                                        ? "/logo_dark_theme_no_text_transparent.png"
                                                        : "/logo_light_theme_no_text_transparent.png"
                                                }
                                                width={106}
                                                height={142}
                                            />
                                        </div>
                                    )}
                                </a>
                            </div>
                            <Card className={`card-columns ${styles.card}`}>
                                <Card.Header className={styles.cardHeader}>
                                    <div style={{ overflow: "hidden" }}>
                                        <a
                                            href={`/game/${gameUrl}`}
                                            style={{ fontSize: "large" }}
                                        >
                                            {game.display}
                                        </a>
                                        <div style={{ float: "right" }}>
                                            <i style={{ alignSelf: "center" }}>
                                                <DurationToFormatted
                                                    duration={game.sort.toString()}
                                                />
                                            </i>
                                        </div>
                                    </div>
                                </Card.Header>
                                <Card.Body className={styles.cardBody}>
                                    {game.categories
                                        .slice(0, 3)
                                        .map((category) => {
                                            return (
                                                <Row key={category.category}>
                                                    <Col
                                                        md={6}
                                                        sm={5}
                                                        style={{
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        <b>
                                                            {category.display}
                                                        </b>
                                                    </Col>
                                                    <Col
                                                        md={6}
                                                        sm={7}
                                                        className={
                                                            styles.timeUser
                                                        }
                                                    >
                                                        <div
                                                            style={{
                                                                width: "3rem",
                                                            }}
                                                        >
                                                            <DurationToFormatted
                                                                duration={
                                                                    category.gameTime
                                                                        ? (category.gameTimePb as string)
                                                                        : category.bestTime
                                                                }
                                                            />{" "}
                                                            {category.gameTime &&
                                                                "(IGT)"}
                                                        </div>
                                                        <div
                                                            className={
                                                                styles.userLink
                                                            }
                                                        >
                                                            <UserLink
                                                                username={
                                                                    category.gameTime
                                                                        ? (category.bestGameTimeUser as string)
                                                                        : category.bestTimeUser
                                                                }
                                                            />
                                                        </div>
                                                    </Col>
                                                    <br />
                                                </Row>
                                            );
                                        })}
                                    {game.categories.length < 3 &&
                                        Array.from({
                                            length: 3 - game.categories.length,
                                        }).map((n) => <br key={n as Key} />)}
                                </Card.Body>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            {count < games.length && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <Button
                        variant={"primary"}
                        className={homeStyles.learnMoreButton}
                        style={{ width: "40rem", marginTop: "1rem" }}
                        onClick={() => {
                            setCount(count + 10);
                        }}
                    >
                        Load more...
                    </Button>
                </div>
            )}
        </div>
    );
};

export const getServerSideProps: GetServerSideProps = async () => {
    const initGames = await getTabulatedGameStatsPopular();
    return {
        props: { initGames },
    };
};

export default Games;
