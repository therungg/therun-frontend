import buildMetadata from '~src/utils/metadata';
import { Media } from './media';

export const metadata = buildMetadata({
    title: 'Media Kit',
    description:
        "We provide a media kit for anyone using The Run's branding in articles or their own websites. Find that here.",
});

export default function MediaPage() {
    return <Media />;
}
