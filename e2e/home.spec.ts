import { test } from "@playwright/test";
import { HomePage } from "./pages/home.pages";

test.describe("Home Page", () => {
    test("can open the about page", async ({ page }) => {
        const homePage = new HomePage(page);
        await homePage.goto();
        await homePage.clickLearnMore();
    });

    test("can open the patreon page", async ({ page }) => {
        const homePage = new HomePage(page);
        await homePage.goto();
        await homePage.clickSupportMe();
    });
});
