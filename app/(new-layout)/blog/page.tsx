import buildMetadata from '~src/utils/metadata';
import { Blog } from './blog';

export const metadata = buildMetadata({
    title: 'Blog',
    description: 'See updates The Run posts about new and upcoming features.',
});

export default function BlogPage() {
    return <Blog />;
}
