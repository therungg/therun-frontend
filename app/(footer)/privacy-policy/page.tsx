import buildMetadata from "~src/utils/metadata";

export const metadata = buildMetadata({
    title: "Privacy Policy",
    description:
        "We want you to worry about your favorite games, not your data. Here's steps we take to protect your data and privacy.",
});

export default function PrivacyPolicy() {
    return (
        <div>
            <p>The Run Privacy Policy</p>
            <p>
                This privacy policy will explain how our The Run uses the
                personal data we collect from you when you use our website.
            </p>
            <p>Topics:</p>
            <p>
                What data do we collect?
                <br />
                How do we collect your data?
                <br />
                How will we use your data?
                <br />
                How do we store your data?
                <br />
                Marketing
                <br />
                What are your data protection rights?
                <br />
                What are cookies?
                <br />
                How do we use cookies?
                <br />
                What types of cookies do we use?
                <br />
                How to manage your cookies
                <br />
                Privacy policies of other websites
                <br />
                Changes to our privacy policy
                <br />
                How to contact us
                <br />
                How to contact the appropriate authorities
                <br />
            </p>
            <p>What data do we collect?</p>
            <p>The Run collects the following data:</p>
            <p>
                Twitch username. This is collected by you logging into The Run
                through Twitch SSO.
                <br />
                Any Livesplit (.lss) files and its data you upload.
                <br />
                Service usage data. For logging purposes, we automatically
                collect some of your access information. This may include your
                IP address, demographic data, and information about your
                browser.
                <br />
                Your email adress. If you send us an email through the contact
                form, we will save your email-address.
                <br />
                Any information provided on your profile. This may include your
                pronouns, name, country or any other information you decide to
                submit.
                <br />
            </p>
            <p>How do we collect your data?</p>
            <p>
                You directly provide The Run with most of the data we collect.
                We collect data and process data when you:
                <br />
                <br />
                Login through Twitch SSO.
                <br />
                Upload your splits files.
                <br />
                Send us an email.
                <br />
                Visit our website.
                <br />
                Submit data to your profile.
                <br />
            </p>
            <p>How will we use your data?</p>
            <p>
                The Run collects your data so that we can:
                <br />
                <br />
                Identify your Twitch username
                <br />
                Process the Livesplit data.
                <br />
                Send you an email back.
                <br />
                Analyze access logs to improve user experience and prevent
                malicious use.
                <br />
                Maintain your user profile.
                <br />
            </p>
            <p>
                If you agree, The Run will share your data with our partner
                companies so that they may offer you their products and
                services.
            </p>
            <p>We do not share your data with any other companies.</p>
            <p>
                The Run securely stores your data at Amazon Web Services data
                centers in EU-West (Ireland). Through their Shared
                Responsibility Model, Amazon Web Services makes sure your data
                is safely stored.
            </p>
            <p>
                The Run will keep your data for an indefinite amount of time.
                You may always contact us by mailing at info@therun.gg to have
                all your data erased.
            </p>
            <p>What are your data protection rights?</p>
            <p>
                The Run would like to make sure you are fully aware of all of
                your data protection rights. Every user is entitled to the
                following:
            </p>
            <p>
                The right to access – You have the right to request The Run for
                copies of your personal data. We may charge you a small fee for
                this service. <br />
                The right to rectification – You have the right to request that
                The Run correct any information you believe is inaccurate. You
                also have the right to request The Run to complete the
                information you believe is incomplete. <br />
                The right to erasure – You have the right to request that The
                Run erase your personal data, under certain conditions. <br />
                The right to restrict processing – You have the right to request
                that The Run restrict the processing of your personal data,
                under certain conditions. <br />
                The right to object to processing – You have the right to object
                to The Run’s processing of your personal data, under certain
                conditions. <br />
                The right to data portability – You have the right to request
                that The Run transfer the data that we have collected to another
                organization, or directly to you, under certain conditions.{" "}
                <br />
            </p>
            <p>
                If you make a request, we have one month to respond to you. If
                you would like to exercise any of these rights, please contact
                us at our email: info@therun.gg
            </p>
            <p>Cookies</p>
            <p>
                Cookies are text files placed on your computer to collect
                standard Internet log information and visitor behavior
                information. When you visit our websites, we may collect
                information from you automatically through cookies or similar
                technology. For further information, visit allaboutcookies.org.
            </p>
            <p>How do we use cookies?</p>
            <p>
                The Run uses cookies in a range of ways to improve your
                experience on our website, including:
            </p>
            <p>
                Keeping you signed in <br />
                Understanding how you use our website
                <br />
                Collect any user preferences
                <br />
            </p>
            <p>What types of cookies do we use?</p>
            <p>
                There are a number of different types of cookies, however, our
                website uses:
            </p>
            <p>
                Functionality – The Run uses these cookies so that we recognize
                you on our website and remember your previously selected
                preferences. These could include what language you prefer and
                location you are in. A mix of first-party and third-party
                cookies are used.
            </p>
            <p>How to manage cookies</p>
            <p>
                You can set your browser not to accept cookies, and the above
                website tells you how to remove cookies from your browser.
                However, in a few cases, some of our website features may not
                function as a result.
            </p>
            <p>Changes to our privacy policy</p>
            <p>
                The Run keeps its privacy policy under regular review and places
                any updates on this web page. This privacy policy was last
                updated on 26 July 2022.
            </p>
            <p>How to contact us</p>
            <p>
                If you have any questions about The Run’s privacy policy, the
                data we hold on you, or you would like to exercise one of your
                data protection rights, please do not hesitate to contact us.
                <br />
                Email us at: info@therun.gg
            </p>
            <p></p>
            If you have any questions about The Run’s privacy policy, the data
            we hold on you, or you would like to exercise one of your data
            protection rights, please do not hesitate to contact us.
            <br />
            Email us at: info@therun.gg
            <br />
            <br />
            How to contact the appropriate authority
            <br />
            Should you wish to report a complaint or if you feel that The Run
            has not addressed your concern in a satisfactory manner, you may
            contact the Information Commissioner’s Office.
            <br />
            Email: info@therun.gg
        </div>
    );
}
