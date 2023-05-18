import { expect, Locator, Page } from "@playwright/test";

export class HomePage {
    readonly learnMoreButton: Locator;
    readonly supportMeButton: Locator;

    constructor(private readonly page: Page) {
        this.learnMoreButton = page.getByTestId("learn-more-button");
        this.supportMeButton = page.getByTestId("support-me-button");
    }

    async goto() {
        await this.page.goto("/");
    }

    async clickLearnMore() {
        await this.learnMoreButton.click();
        await this.page.waitForURL("/about");
    }

    async clickSupportMe() {
        await this.supportMeButton.click();
        await this.page.waitForURL("/patron");
    }
}
