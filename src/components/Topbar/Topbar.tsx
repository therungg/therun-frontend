"use client";
import { Container, Nav, Navbar, NavDropdown } from "react-bootstrap";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TwitchUser } from "../twitch/TwitchUser";
import { TwitchLoginButton } from "../twitch/TwitchLoginButton";
import { Upload } from "react-bootstrap-icons";
import { resetSession } from "~src/actions/reset-session.action";
import { Button } from "~src/components/Button/Button";
import { useTheme } from "next-themes";
import { BunnyIcon } from "~src/icons/bunny-icon";
import { Can } from "~src/rbac/Can.component";

const DarkModeSlider = dynamic(() => import("../dark-mode-slider"), {
    ssr: false,
});

const GlobalSearch = dynamic(
    () =>
        import("~src/components/search/global-search.component").then(
            (mod) => mod.GlobalSearch,
        ),
    {
        ssr: false,
    },
);

interface TopbarProps {
    username: string;
    picture: string;
    sessionError: string | null;
}

export const Topbar = ({
    username,
    picture,
    sessionError,
}: Partial<TopbarProps>) => {
    const router = useRouter();
    const { theme = "dark" } = useTheme();
    const [show, setShow] = useState(false);

    const handleResetSession = useCallback(async () => {
        await resetSession();
        window.location.reload();
    }, []);

    async function logout() {
        await fetch("/api/logout", {
            method: "POST",
        });
        router.push("/");
        router.refresh();
    }
    const showDropdown = () => {
        setShow(true);
    };
    const hideDropdown = () => {
        setShow(false);
    };

    return (
        <>
            <Navbar
                expand="lg"
                onMouseLeave={hideDropdown}
                data-bs-theme={theme}
            >
                <Container>
                    <Navbar.Brand href="/" className="d-flex">
                        <Image
                            unoptimized
                            alt="TheRun"
                            src={`/logo_${theme}_theme_no_text_transparent.png`}
                            height="44"
                            width="44"
                            className="img-fluid align-self-start me-2"
                        />
                        <span className="align-self-center">
                            The Run{" "}
                            <i>
                                <sup>beta</sup>
                            </i>
                        </span>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            {username && (
                                <Nav.Link className="mh-2r" href="/upload">
                                    <div className="d-flex">
                                        <b>Upload</b>

                                        <span className="ms-2">
                                            <Upload size={18} />
                                        </span>
                                    </div>
                                </Nav.Link>
                            )}

                            <Nav.Link href="/races">Races</Nav.Link>
                            <Nav.Link href="/live">Live</Nav.Link>

                            {/*{username && (*/}
                            {/*    <Nav.Link href="/stories/manage">*/}
                            {/*        Story Mode*/}
                            {/*    </Nav.Link>*/}
                            {/*)}*/}
                            <Nav.Link href="/patron">
                                Support us! <BunnyIcon />
                            </Nav.Link>
                        </Nav>
                        <Nav className="ml-auto mb-2 mb-lg-0 me-lg-2">
                            <GlobalSearch />
                        </Nav>
                        <Nav className="ml-auto">
                            {" "}
                            <DarkModeSlider />
                        </Nav>
                        <Nav
                            className="ml-auto"
                            onMouseEnter={showDropdown}
                            onClick={showDropdown}
                        >
                            {username && (
                                <NavDropdown
                                    show={show}
                                    title={
                                        <TwitchUser
                                            username={username}
                                            picture={picture || ""}
                                        />
                                    }
                                    id="basic-nav-dropdown"
                                >
                                    <NavDropdown.Item href={`/${username}`}>
                                        Profile
                                    </NavDropdown.Item>
                                    <NavDropdown.Item href="/livesplit">
                                        LiveSplit Key
                                    </NavDropdown.Item>
                                    <NavDropdown.Item href="/change-appearance">
                                        Name Appearance
                                    </NavDropdown.Item>
                                    <NavDropdown.Item href="/stories/manage">
                                        Story Preferences
                                    </NavDropdown.Item>
                                    <Can I="moderate" a="roles">
                                        <NavDropdown.Item href="/admin/roles">
                                            Admin Panel
                                        </NavDropdown.Item>
                                    </Can>
                                    <NavDropdown.Item
                                        onClick={async () => {
                                            await logout();
                                        }}
                                    >
                                        Logout
                                    </NavDropdown.Item>
                                </NavDropdown>
                            )}
                            {sessionError && (
                                <div className="ms-2">
                                    <Button
                                        className="btn btn-primary"
                                        onClick={handleResetSession}
                                    >
                                        Reset session
                                    </Button>
                                </div>
                            )}
                            {!sessionError && !username && (
                                <TwitchLoginButton url="/api" />
                            )}
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
        </>
    );
};
Topbar.displayName = "Topbar";
