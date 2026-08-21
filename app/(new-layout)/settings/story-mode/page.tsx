import ManageStories from '~app/(new-layout)/stories/manage/manage-stories';
import buildMetadata from '~src/utils/metadata';

export default async function StoryModeSettingsPage() {
    return <ManageStories />;
}

export const metadata = buildMetadata({
    title: 'Story Mode',
    description: 'Configure Story Mode narration for your live runs.',
    index: false,
    follow: false,
});
