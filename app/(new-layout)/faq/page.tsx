import buildMetadata from '~src/utils/metadata';
import { Faq } from './faq';

export const metadata = buildMetadata({
    title: 'Frequently Asked Questions',
    description:
        'Get some answers to some frequently asked questions about The Run.',
});

export default function FAQPage() {
    return <Faq />;
}
