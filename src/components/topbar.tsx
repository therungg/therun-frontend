"use client";
import { Container, Nav, Navbar, NavDropdown } from "react-bootstrap";
import { Search } from "./search";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PatreonBunnySvgWithoutLink } from "~app/patron/patreon-info";
import Image from "next/image";
import { TwitchUser } from "./twitch/TwitchUser";
import { TwitchLoginButton } from "./twitch/TwitchLoginButton";
import { getColorMode } from "~src/utils/colormode";

const DarkModeSlider = dynamic(() => import("./dark-mode-slider"), {
    ssr: false,
});

const Topbar = ({
    username,
    picture,
}: {
    username?: string;
    picture?: string;
}) => {
    const router = useRouter();
    const [show, setShow] = useState(false);
    const [dark, setDark] = useState(true);

    useEffect(function () {
        setDark(getColorMode() !== "light");
    }, []);

    const showDropdown = () => {
        setShow(true);
    };
    const hideDropdown = () => {
        setShow(false);
    };

    async function logout() {
        await fetch("/api/logout", {
            method: "POST",
        });
        router.push("/");
        router.refresh();
    }

    return (
        <Navbar
            expand="lg"
            onMouseLeave={hideDropdown}
            data-bs-theme={dark ? "dark" : "light"}
        >
            <Container>
                <Navbar.Brand href="/" className="d-flex">
                    <Image
                        alt={"TheRun"}
                        src={
                            dark
                                ? "/logo_dark_theme_no_text_transparent.png"
                                : "/logo_light_theme_no_text_transparent.png"
                        }
                        height={"44"}
                        width={"44"}
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
                            <Nav.Link
                                href="/upload"
                                style={{ maxHeight: "2rem" }}
                            >
                                <div className="d-flex">
                                    <b>Upload</b>
                                    <span
                                        className={
                                            "material-symbols-outlined upload-icon"
                                        }
                                    >
                                        {" "}
                                        file_upload{" "}
                                    </span>
                                </div>
                            </Nav.Link>
                        )}
                        <Nav.Link href="/live">
                            <b>Live</b>
                        </Nav.Link>
                        <Nav.Link href="/games/">Games</Nav.Link>
                        <Nav.Link href="/patron">
                            Support <PatreonBunnySvgWithoutLink />
                        </Nav.Link>
                    </Nav>
                    <Nav className="ml-auto mb-2 mb-lg-0 me-lg-2">
                        <Search />
                    </Nav>
                    <Nav
                        className="ml-auto"
                        onClick={(e) => {
                            if (e.target.className.includes("input")) {
                                setDark(!dark);
                            }
                        }}
                    >
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
                                <NavDropdown.Item href={"/upload-key"}>
                                    Upload Key
                                </NavDropdown.Item>
                                <NavDropdown.Item href={"/change-appearance"}>
                                    Name Appearance
                                </NavDropdown.Item>
                                <NavDropdown.Item onClick={() => logout()}>
                                    Logout
                                </NavDropdown.Item>
                            </NavDropdown>
                        )}
                        {!username && <TwitchLoginButton url="/api" />}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};
export default Topbar;
