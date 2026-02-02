'use client';

import { EditorProvider, useCurrentEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from './Button/Button';

interface TiptapProps {
    onChange: (content: string) => void;
    initialContent?: string;
}

const Tiptap: React.FC<TiptapProps> = ({ onChange, initialContent }) => {
    return (
        <EditorProvider
            slotBefore={<MenuBar />}
            extensions={[StarterKit]}
            immediatelyRender={false}
            content={initialContent}
            editorProps={{
                attributes: {
                    class: 'bg-body-tertiary px-3 py-2 rounded lg',
                    style: 'min-height: 15rem',
                },
            }}
            onUpdate={(editor) => {
                {
                    onChange(editor.editor.getHTML());
                }
            }}
        ></EditorProvider>
    );
};

const MenuBar = () => {
    const { editor } = useCurrentEditor();

    if (!editor) {
        return null;
    }

    return (
        <div className="flex space-x-2 mb-2">
            <Button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'active' : ''}
                variant="secondary"
            >
                Bold
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'active' : ''}
                variant="secondary"
            >
                Italic
            </Button>
            <Button
                onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
                className={
                    editor.isActive('heading', { level: 1 }) ? 'active' : ''
                }
                variant="secondary"
            >
                H1
            </Button>
            <Button
                onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                className={
                    editor.isActive('heading', { level: 2 }) ? 'active' : ''
                }
                variant="secondary"
            >
                H2
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive('bulletList') ? 'active' : ''}
                variant="secondary"
            >
                Bullet List
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive('orderedList') ? 'active' : ''}
                variant="secondary"
            >
                Ordered List
            </Button>
            <Button
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                className={editor.isActive('horizontalRule') ? 'active' : ''}
                variant="secondary"
            >
                Divider
            </Button>
        </div>
    );
};

export default Tiptap;
