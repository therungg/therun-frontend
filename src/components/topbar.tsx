"use client";
import { Container, Nav, Navbar, NavDropdown } from "react-bootstrap";
import { Search } from "./search";
import dynamic from "next/dynamic";
import styles from "./css/Topbar.module.scss";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PatreonBunnySvgWithoutLink } from "../pages/patron";
import Image from "next/image";
import { TwitchUser } from "./twitch/TwitchUser";
import { TwitchLoginServer } from "./twitch/TwitchLoginButton.server";

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
        setDark(document.documentElement.dataset.theme !== "light");
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
            className={styles.navbar}
            onMouseLeave={hideDropdown}
        >
            <Container>
                <Navbar.Brand href="/" className={styles.navbarLogo}>
                    <div style={{ display: "flex" }}>
                        <Image
                            alt={"Logo"}
                            src={
                                dark
                                    ? "/logo_dark_theme_no_text_transparent.png"
                                    : "/logo_light_theme_no_text_transparent.png"
                            }
                            height={"44"}
                            width={"44"}
                            style={{
                                alignSelf: "flex-start",
                                marginRight: "0.5rem",
                                maxWidth: "100%",
                                height: "auto",
                            }}
                        />
                        <div style={{ alignSelf: "center" }}>
                            The Run{" "}
                            <i>
                                <sup>beta</sup>
                            </i>
                        </div>
                    </div>
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className={`me-auto ${styles.nav}`}>
                        {username && (
                            <Nav.Link
                                className={styles.navLink}
                                href="/upload"
                                style={{ maxHeight: "2rem" }}
                            >
                                <div style={{ display: "flex" }}>
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
                        <Nav.Link className={styles.navLink} href="/live">
                            <b>Live</b>
                        </Nav.Link>
                        <Nav.Link className={styles.navLink} href="/games/">
                            Games
                        </Nav.Link>
                        <Nav.Link className={styles.navLink} href="/patron">
                            Support <PatreonBunnySvgWithoutLink />
                        </Nav.Link>
                    </Nav>
                    <Nav className="ml-auto">
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
                        {!username && <TwitchLoginServer redirect="/api" />}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};
export default Topbar;
