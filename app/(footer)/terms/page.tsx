import Link from 'next/link';
import buildMetadata from '~src/utils/metadata';

export const metadata = buildMetadata({
    title: 'Terms & Conditions',
    description: 'Terms & Conditions for using and accessing The Run.',
});

export default function Terms() {
    return (
        <div>
            Hi there. <br />
            <br /> If you continue to use this website, you are agreeing to
            comply with and be bound by the following terms and conditions of
            use, which together with the{' '}
            <Link href="/privacy-policy" prefetch={false}>
                Privacy policy
            </Link>{' '}
            govern The Runs relationship with you in relation to this website.
            <br />
            <br />
            If you disagree with any part of these terms and conditions, please
            do not use this website.
            <br />
            <br />
            <div>
                The use of this website is subject to the following terms of
                use:
                <ul>
                    <li>
                        The content of the pages of this website is for your
                        general information and use only. It is subject to
                        change without notice.
                    </li>
                    <li>
                        Neither we nor any third parties provide any warranty or
                        guarantee as to the accuracy, timeliness, performance,
                        completeness or suitability of the information and
                        materials found or offered on this website for any
                        particular purpose. You acknowledge that such
                        information and materials may contain inaccuracies or
                        errors and we expressly exclude liability for any such
                        inaccuracies or errors to the fullest extent permitted
                        by law.
                    </li>
                    <li>
                        Your use of any information or materials on this website
                        is entirely at your own risk, for which we shall not be
                        liable. It shall be your own responsibility to ensure
                        that any products, services or information available
                        through this website meet your specific requirements.
                    </li>
                    <li>
                        This website contains material which is owned by or
                        licensed to us. This material includes, but is not
                        limited to, the design, layout, look, appearance and
                        graphics. Reproduction is prohibited other than in
                        accordance with the copyright notice, which forms part
                        of these terms and conditions.
                    </li>
                    <li>
                        Unauthorised use of this website may give rise to a
                        claim for damages and/or be a criminal offence.
                    </li>
                    <li>
                        From time to time, this website may also include links
                        to other websites. These links are provided for your
                        convenience to provide further information. They do not
                        signify that we endorse the website(s). We have no
                        responsibility for the content of the linked website(s).
                    </li>
                    <li>
                        Your use of this website and any dispute arising out of
                        such use of the website is subject to the laws of The
                        Netherlands.
                    </li>
                    <li>
                        Provided that you are eligible to use the Site, you are
                        granted a limited license to access and use the Site and
                        to download or print a copy of any portion of the
                        Content to which you have properly gained access solely
                        for your personal, non-commercial use. We reserve all
                        rights not expressly granted to you in and to the Site,
                        the Content and the Marks.
                    </li>
                    <li>
                        If you provide any information that is untrue,
                        inaccurate, not current, or incomplete, we have the
                        right to suspend or terminate your account and refuse
                        any and all current or future use of the Site (or any
                        portion thereof).
                    </li>
                    <li>
                        By using the Login with Twitch-feature, you allow us to
                        read your Twitch username.
                    </li>

                    <li>
                        If we terminate or suspend your account for any reason,
                        you are prohibited from registering and creating a new
                        account under your name, a fake or borrowed name, or the
                        name of any third party, even if you may be acting on
                        behalf of the third party. In addition to terminating or
                        suspending your account, we reserve the right to take
                        appropriate legal action, including without limitation
                        pursuing civil, criminal, and injunctive redress.
                    </li>
                </ul>
            </div>
        </div>
    );
}
