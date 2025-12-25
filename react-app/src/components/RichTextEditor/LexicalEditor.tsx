/**
 * Lexical Rich Text Editor Component
 */
import React, { useRef, useEffect, useState } from 'react';
import { 
  $getRoot, 
  $getSelection, 
  EditorState, 
  LexicalEditor as LexicalEditorType,
  $createParagraphNode,
  $createTextNode
} from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeNode, CodeHighlightNode } from '@lexical/code';

import RichTextToolbar from './RichTextToolbar';

interface LexicalEditorProps {
  content?: string;
  onChange?: (content: string, editorState: EditorState) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
}

// Content initialization component
const ContentInitializer: React.FC<{ content: string }> = ({ content }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (content) {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        
        // Parse the content and create appropriate nodes
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          const paragraph = $createParagraphNode();
          if (line.trim()) {
            const textNode = $createTextNode(line);
            paragraph.append(textNode);
          }
          root.append(paragraph);
        });
      });
    }
  }, [editor, content]);

  return null;
};

const theme = {
  // Heading
  heading: {
    h1: 'text-3xl font-bold mb-4 text-gray-900',
    h2: 'text-2xl font-bold mb-3 text-gray-900',
    h3: 'text-xl font-bold mb-2 text-gray-900',
    h4: 'text-lg font-semibold mb-2 text-gray-900',
    h5: 'text-base font-semibold mb-2 text-gray-900',
    h6: 'text-sm font-semibold mb-2 text-gray-900',
  },
  // Lists
  list: {
    nested: {
      listitem: 'list-none',
    },
    ol: 'list-decimal list-inside mb-4 ml-4',
    ul: 'list-disc list-inside mb-4 ml-4',
    listitem: 'mb-1',
  },
  // Text formatting
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-orange-600',
  },
  // Code blocks
  code: 'bg-gray-100 p-4 rounded-lg font-mono text-sm mb-4 overflow-x-auto',
  // Links
  link: 'text-orange-600 hover:text-orange-700 underline cursor-pointer',
  // Paragraphs
  paragraph: 'mb-4 leading-relaxed',
  // Quote
  quote: 'border-l-4 border-orange-500 pl-4 italic text-gray-700 mb-4',
};

const onError = (error: Error) => {
  console.error('Lexical Error:', error);
};

const LexicalEditor: React.FC<LexicalEditorProps> = ({
  content = '',
  onChange,
  placeholder = 'メモを入力してください...',
  className = '',
  readOnly = false,
  autoFocus = false
}) => {
  const editorRef = useRef<LexicalEditorType>(null);

  const initialConfig = {
    namespace: 'TanQMateEditor',
    theme,
    onError,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      CodeNode,
      CodeHighlightNode,
    ],
    editable: !readOnly,
  };

  const handleEditorChange = (editorState: EditorState, editor: LexicalEditorType) => {
    editorRef.current = editor;
    if (onChange) {
      editorState.read(() => {
        const root = $getRoot();
        const textContent = root.getTextContent();
        onChange(textContent, editorState);
      });
    }
  };

  return (
    <div className={`lexical-editor ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-container">
          {!readOnly && (
            <RichTextToolbar />
          )}
          
          <div className={`
            editor-inner 
            border border-gray-300 rounded-lg 
            ${!readOnly ? 'min-h-[400px]' : 'min-h-[200px]'}
            ${readOnly ? 'bg-gray-50' : 'bg-white'}
          `}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-input p-4 outline-none resize-none overflow-auto"
                  autoFocus={autoFocus}
                  style={{ minHeight: readOnly ? '200px' : '400px' }}
                />
              }
              placeholder={
                <div className="editor-placeholder absolute top-4 left-4 text-gray-400 pointer-events-none select-none">
                  {placeholder}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            
            {/* プラグイン */}
            <OnChangePlugin onChange={handleEditorChange} />
            <HistoryPlugin />
            <ListPlugin />
            <LinkPlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            
            {/* コンテンツ初期化 */}
            {content && <ContentInitializer content={content} />}
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
};

export default LexicalEditor;