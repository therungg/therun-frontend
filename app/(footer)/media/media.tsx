"use client";
import { Title } from "~src/components/title";
import { Button, Col, Image, Row } from "react-bootstrap";
import styles from "~src/components/css/Home.module.scss";
import mediaStyles from "~src/components/css/Media.module.scss";
import Switch from "react-switch";
import { useEffect, useState } from "react";

export const Media = () => {
    const [loaded, setLoaded] = useState(false);
    const cfBaseUrl = "https://d73zqe3h0v0mi.cloudfront.net/therun/";

    const [logoTransparent, setLogoTransparent] = useState(true);
    const [logoDark, setLogoDark] = useState(true);
    const [logoCropped, setLogoCropped] = useState(true);
    const [logoUrl, setLogoUrl] = useState(true);

    const [bannerTransparent, setBannerTransparent] = useState(true);
    const [bannerDark, setBannerDark] = useState(true);
    const [bannerWithLogo, setBannerWithLogo] = useState(true);

    const getLogoPath = () => {
        let path = "media/";
        path += logoCropped ? "logo_cropped/" : "logo/";

        path += "logo_";
        path += logoDark ? "dark_theme_" : "light_theme_";
        path += logoUrl ? "text" : "no_text";

        if (logoTransparent) path += "_transparent";

        path += ".png";

        return path;
    };

    const getBannerPath = () => {
        let path = "media/banner/";
        path += bannerWithLogo ? "twitterbanner_" : "banner_no_logo_";
        path += bannerDark ? "dark_theme" : "light_theme";
        path += bannerTransparent ? "_transparent" : "";
        path += ".png";

        return path;
    };

    const logoPath = getLogoPath();
    const logoCfUrl = cfBaseUrl + logoPath;

    const bannerPath = getBannerPath();
    const bannerCfUrl = cfBaseUrl + bannerPath;

    useEffect(() => {
        if (!loaded) {
            setLoaded(true);
        }
    }, [loaded]);

    return (
        <div>
            <Title>Media</Title>
            <p>
                I created a little media kit with the logo, some banners, and
                the original gimp files. Use them however you want, as long as
                you link back to therun.gg. If you can not explicitly link back
                to the site, please use the version of the logo that has the url
                in it.
            </p>

            <hr />

            <div>Download full media kit (925kb zipped):</div>
            <div className={mediaStyles.downloadButton}>
                <a href={`${cfBaseUrl}therun-media.zip`}>
                    <Button
                        variant={"primary"}
                        className={styles.learnMoreButton}
                    >
                        Download full kit
                    </Button>
                </a>
            </div>

            <hr />
            <p>
                You can also download all the files seperately. First select
                which variant you want to download, then click the download
                button.
            </p>
            {loaded && (
                <div>
                    <Row>
                        <Col>
                            <h2 className={mediaStyles.logo}>Logo</h2>

                            <div className={styles.flexLarge}>
                                <div className={mediaStyles.logoContainer}>
                                    <div className={mediaStyles.options}>
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue("--color-link")}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--color-tertiary"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setLogoTransparent(checked);
                                            }}
                                            checked={logoTransparent}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className={mediaStyles.optionLabel}
                                        >
                                            {" "}
                                            Transparent background{" "}
                                        </label>
                                    </div>
                                    <div className={mediaStyles.options}>
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue("--color-link")}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--color-tertiary"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setLogoDark(checked);
                                            }}
                                            checked={logoDark}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className={mediaStyles.optionLabel}
                                        >
                                            {" "}
                                            Dark theme{" "}
                                        </label>
                                    </div>
                                    <div className={mediaStyles.options}>
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue("--color-link")}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--color-tertiary"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setLogoCropped(checked);
                                            }}
                                            checked={logoCropped}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className={mediaStyles.optionLabel}
                                        >
                                            {" "}
                                            Cropped{" "}
                                        </label>
                                    </div>
                                    <div className={mediaStyles.options}>
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue("--color-link")}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--color-tertiary"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setLogoUrl(checked);
                                            }}
                                            checked={logoUrl}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className={mediaStyles.optionLabel}
                                        >
                                            {" "}
                                            With URL text in logo{" "}
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <div className={styles.logoMedia}>
                                        <Image
                                            src={`/${logoPath}`}
                                            height={130}
                                            alt={"The Run Logo"}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div
                                    className={
                                        mediaStyles.downloadButtonContainer
                                    }
                                >
                                    <a
                                        href={logoCfUrl}
                                        className={
                                            mediaStyles.downloadButtonSingle
                                        }
                                    >
                                        <Button
                                            variant={"primary"}
                                            className={styles.learnMoreButton}
                                        >
                                            Download logo
                                        </Button>
                                    </a>
                                </div>
                            </div>
                        </Col>

                        <Col lg={12} xl={6}>
                            <h2 className={mediaStyles.logoContainer}>
                                Banner
                            </h2>

                            <div className={styles.flexLarge}>
                                <div className={mediaStyles.logoContainer}>
                                    <div className={mediaStyles.options}>
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue("--color-link")}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--color-tertiary"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setBannerTransparent(checked);
                                            }}
                                            checked={bannerTransparent}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className={mediaStyles.optionLabel}
                                        >
                                            {" "}
                                            Transparent background{" "}
                                        </label>
                                    </div>
                                    <div className={mediaStyles.options}>
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue("--color-link")}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--color-tertiary"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setBannerDark(checked);
                                            }}
                                            checked={bannerDark}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className={mediaStyles.optionLabel}
                                        >
                                            {" "}
                                            Dark theme{" "}
                                        </label>
                                    </div>
                                    <div className={mediaStyles.options}>
                                        <Switch
                                            onColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue("--color-link")}
                                            offColor={getComputedStyle(
                                                document.documentElement
                                            ).getPropertyValue(
                                                "--color-tertiary"
                                            )}
                                            name={"switch"}
                                            onChange={(checked) => {
                                                setBannerWithLogo(checked);
                                            }}
                                            checked={bannerWithLogo}
                                        />
                                        <label
                                            htmlFor={"switch"}
                                            className={mediaStyles.optionLabel}
                                        >
                                            {" "}
                                            With logo{" "}
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <div className={styles.logoMedia}>
                                        <Image
                                            src={`/${bannerPath}`}
                                            height={130}
                                            alt={"The Run Logo"}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div
                                    className={
                                        mediaStyles.downloadButtonContainer
                                    }
                                >
                                    <a
                                        href={bannerCfUrl}
                                        className={
                                            mediaStyles.downloadButtonSingle
                                        }
                                    >
                                        <Button
                                            variant={"primary"}
                                            className={styles.learnMoreButton}
                                        >
                                            Download banner
                                        </Button>
                                    </a>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            )}
        </div>
    );
};

export default Media;
