import { useRouter } from 'next/navigation';
import React, { useEffect, useReducer, useState } from 'react';
import { Col, Image, Row, Table } from 'react-bootstrap';
import { GlobalGameData } from '~app/(old-layout)/[username]/[game]/[run]/run';
import { GameImage } from '~src/components/image/gameimage';
import { Can, subject } from '~src/rbac/Can.component';
import { getColorMode } from '~src/utils/colormode';
import { Run } from '../../../common/types';
import styles from '../../css/User.module.scss';
import { GameLink, UserGameCategoryLink } from '../../links/links';
import { DurationToFormatted, IsoToFormatted } from '../../util/datetime';
import { EditRun } from '../dashboard/edit-run';

export const UserOverview = ({
    runs,
    username,
    gameTime,
    session,
    allGlobalGameData,
    parentForceUpdate,
}: {
    runs: Map<string, Run[]>;
    username: string;
    gameTime: boolean;
    session: { id?: string; username?: string };
    allGlobalGameData: GlobalGameData[];
    parentForceUpdate: () => void;
}) => {
    const [, forceUpdate] = useReducer((x) => x + 1, 0);
    const [openedEdit, setOpenedEdit] = useState([]);
    const [dark, setDark] = useState(true);
    const router = useRouter();

    useEffect(function () {
        setDark(getColorMode() !== 'light');
    }, []);

    const images = Array.from(runs).filter(([game]) => {
        game = game.split('#')[0];
        const globalData = allGlobalGameData.find(
            (data) => data.display.toLowerCase() == game.toLowerCase(),
        );

        return globalData && globalData.image && globalData.image != 'noimage';
    });

    let lastGame = null;

    // The layouting on this is terrible, sometimes it doesn't group properly, sometimes it indents for no reason.
    // TODO:: Fix!!
    return (
        <div>
            {Array.from(runs).map(([game, orderedRuns], n) => {
                let lastVars = '';
                const split = game.split('#');
                const originalGame = game;

                game = split[0];

                const sameGame = game === lastGame;
                lastGame = game;

                let vars = split.splice(1);

                const usedVars = [];
                const varsCopy = vars;

                vars = vars.filter((variable) => {
                    const splitVariables = variable.split(':');
                    const k = splitVariables[0];

                    if (usedVars.includes(k)) return false;

                    usedVars.push(k);

                    if (lastVars.includes(variable)) return false;

                    return k != 'Verified';
                });

                lastVars = varsCopy;

                const varLenghts = vars.map((variable) => variable.length);
                const longestVar = Math.max(...varLenghts);

                const globalData = allGlobalGameData.find(
                    (data) => data.display.toLowerCase() == game.toLowerCase(),
                );
                const forceRealTime = globalData && globalData.forceRealTime;
                let xl = 6;
                if (longestVar < 35) xl = 3;

                return (
                    <div
                        key={n}
                        className="clearfix"
                        style={{
                            marginLeft:
                                sameGame && globalData && images.length > 0
                                    ? '117px'
                                    : '0',
                        }}
                    >
                        {!sameGame && globalData && images.length > 0 && (
                            <div
                                className={styles.image}
                                style={{ cursor: 'pointer' }}
                            >
                                {!sameGame && (
                                    <a href={`/games/${game}`}>
                                        {globalData.image &&
                                            globalData.image != 'noimage' && (
                                                <GameImage
                                                    alt={globalData.display}
                                                    src={globalData.image}
                                                    quality="medium"
                                                    height={132}
                                                    width={99}
                                                />
                                            )}
                                        {(!globalData.image ||
                                            globalData.image == 'noimage') && (
                                            <Image
                                                alt="Logo"
                                                src={
                                                    dark
                                                        ? '/logo_dark_theme_no_text_transparent.png'
                                                        : '/logo_light_theme_no_text_transparent.png'
                                                }
                                                height={0}
                                                width={0}
                                            />
                                        )}
                                    </a>
                                )}
                            </div>
                        )}
                        {!sameGame && (
                            <h2>{!sameGame && <GameLink game={game} />}</h2>
                        )}
                        {vars.length > 0 && (
                            <small
                                style={{
                                    display: 'flex',
                                    marginBottom: '0.3rem',
                                }}
                            >
                                <Row style={{ width: '100%' }}>
                                    {vars.map((variable) => {
                                        const splitVariables =
                                            variable.split(':');
                                        const k = splitVariables[0];
                                        const v = splitVariables
                                            .splice(1)
                                            .join(':');

                                        return (
                                            <Col
                                                xl={xl}
                                                key={k}
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                <i>{k}</i>:{' '}
                                                <b className="fs-15p">{v}</b>
                                            </Col>
                                        );
                                    })}
                                </Row>
                            </small>
                        )}
                        <Table key={game} bordered hover responsive>
                            <thead
                                className={
                                    sameGame ? styles.sameGameRunHeader : ''
                                }
                            >
                                <tr>
                                    <th style={{ width: '40%' }}>Run</th>
                                    <th style={{ width: '13%' }}>PB</th>
                                    <th style={{ width: '13%' }}>Attempts</th>
                                    <th style={{ width: '13%' }}>Played</th>
                                    <th style={{ width: '29%' }}>PB Time</th>
                                    <Can
                                        I="delete"
                                        this={subject('run', username)}
                                    >
                                        <th>Delete</th>
                                        <th>Edit</th>
                                        <th>Highlight</th>
                                    </Can>
                                </tr>
                            </thead>
                            <tbody>
                                {orderedRuns.map((run: Run, runKey) => {
                                    const useRun =
                                        gameTime &&
                                        !!run.gameTimeData &&
                                        !forceRealTime &&
                                        run.gameTimeData.personalBest &&
                                        parseInt(
                                            run.gameTimeData.personalBest,
                                        ) > 1000
                                            ? { ...run, ...run.gameTimeData }
                                            : run;

                                    return (
                                        <tr key={run.uploadTime.toString()}>
                                            <td style={{ width: '40%' }}>
                                                <div
                                                    style={{ display: 'flex' }}
                                                >
                                                    <UserGameCategoryLink
                                                        username={run.user}
                                                        category={run.run}
                                                        game={run.game}
                                                        url={
                                                            run.customUrl
                                                                ? `${run.user}/${run.customUrl}`
                                                                : run.url
                                                        }
                                                    >
                                                        {run.run}
                                                    </UserGameCategoryLink>

                                                    {run.highlighted && (
                                                        <div
                                                            style={{
                                                                marginLeft:
                                                                    '0.5rem',
                                                            }}
                                                        >
                                                            <StarFilledInIcon />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ width: '13%' }}>
                                                <DurationToFormatted
                                                    duration={
                                                        useRun.personalBest
                                                    }
                                                    gameTime={
                                                        gameTime &&
                                                        !!run.gameTimeData
                                                            ?.personalBest &&
                                                        !forceRealTime
                                                    }
                                                />{' '}
                                                {gameTime &&
                                                    !forceRealTime &&
                                                    !!run.gameTimeData
                                                        ?.personalBest &&
                                                    '(IGT)'}
                                            </td>
                                            <td style={{ width: '13%' }}>
                                                {run.attemptCount}
                                            </td>
                                            <td style={{ width: '13%' }}>
                                                <DurationToFormatted
                                                    duration={run.totalRunTime}
                                                />
                                            </td>
                                            <td
                                                className="text-nowrap"
                                                style={{ width: '29%' }}
                                            >
                                                <IsoToFormatted
                                                    iso={
                                                        gameTime &&
                                                        !!run.gameTimeData
                                                            ?.personalBestTime
                                                            ? run.gameTimeData
                                                                  ?.personalBestTime
                                                            : run.personalBestTime
                                                    }
                                                />
                                            </td>
                                            <Can
                                                I="delete"
                                                this={subject('run', username)}
                                            >
                                                <td>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent:
                                                                'center',
                                                            cursor: 'pointer',
                                                        }}
                                                        onClick={async () => {
                                                            if (
                                                                confirm(
                                                                    `Are you sure you want to delete ${run.game} - ${run.run}?`,
                                                                )
                                                            ) {
                                                                const userIdentifier = `${session.id}-${username}`;
                                                                const deleteUrl =
                                                                    run.url.replace(
                                                                        username,
                                                                        userIdentifier,
                                                                    );
                                                                await fetch(
                                                                    `/api/users/${deleteUrl}`,
                                                                    {
                                                                        method: 'DELETE',
                                                                    },
                                                                );

                                                                delete runs.get(
                                                                    originalGame,
                                                                )[runKey];

                                                                router.refresh();
                                                                forceUpdate();
                                                            }
                                                        }}
                                                    >
                                                        <TrashIcon />
                                                    </div>
                                                </td>
                                                <td>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent:
                                                                'center',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                cursor: 'pointer',
                                                            }}
                                                            onClick={() => {
                                                                if (
                                                                    openedEdit[0] ==
                                                                        game &&
                                                                    openedEdit[1] ==
                                                                        run.originalRun
                                                                ) {
                                                                    setOpenedEdit(
                                                                        [],
                                                                    );
                                                                } else {
                                                                    setOpenedEdit(
                                                                        [
                                                                            game,
                                                                            run.originalRun,
                                                                        ],
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <EditIcon />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent:
                                                                'center',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                cursor: 'pointer',
                                                            }}
                                                            onClick={async () => {
                                                                const userIdentifier = `${session.id}-${username}`;
                                                                const editUrl =
                                                                    run.url.replace(
                                                                        username,
                                                                        userIdentifier,
                                                                    );
                                                                const result =
                                                                    await fetch(
                                                                        `/api/users/${editUrl}/highlight`,
                                                                        {
                                                                            method: 'PUT',
                                                                        },
                                                                    );

                                                                const str =
                                                                    await result.json();

                                                                runs.get(
                                                                    originalGame,
                                                                )[
                                                                    runKey
                                                                ].highlighted =
                                                                    str.result.highlighted;

                                                                router.refresh();
                                                            }}
                                                        >
                                                            {!run.highlighted ? (
                                                                <StarIcon />
                                                            ) : (
                                                                <StarFilledInIcon />
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </Can>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>

                        {orderedRuns.map((run: Run, runKey) => {
                            return (
                                openedEdit[0] == game &&
                                openedEdit[1] == run.originalRun && (
                                    <div key={run.originalRun}>
                                        <EditRun
                                            run={run}
                                            abort={() => setOpenedEdit([])}
                                            session={session}
                                            username={username}
                                            forceUpdate={(newRun: Run) => {
                                                runs.get(originalGame)[
                                                    runKey
                                                ].vod = newRun.vod;
                                                runs.get(originalGame)[
                                                    runKey
                                                ].description =
                                                    newRun.description;
                                                runs.get(originalGame)[
                                                    runKey
                                                ].customUrl = newRun.customUrl;
                                                parentForceUpdate();
                                            }}
                                        />
                                    </div>
                                )
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

// TODO: Move this to the icons directory
const TrashIcon = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            className="bi bi-trash"
            viewBox="0 0 16 16"
        >
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
            <path
                fillRule="evenodd"
                d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
            />
        </svg>
    );
};

// TODO: Move this to the icons directory
const EditIcon = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            className="bi bi-pencil"
            viewBox="0 0 16 16"
        >
            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
        </svg>
    );
};

// TODO: Move this to the icons directory
const StarIcon = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            className="bi bi-star"
            viewBox="0 0 16 16"
        >
            <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z" />
        </svg>
    );
};

// TODO: Move this to the icons directory
export const StarFilledInIcon = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="gold"
            className="bi bi-star-fill"
            viewBox="0 0 16 16"
        >
            <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z" />
        </svg>
    );
};
