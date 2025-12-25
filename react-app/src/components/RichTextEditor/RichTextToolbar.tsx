/**
 * Rich Text Editor Toolbar Component
 */
import React, { useCallback, useState, useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  SELECTION_CHANGE_COMMAND,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
} from 'lexical';
import {
  $createHeadingNode,
  $createQuoteNode,
  HeadingTagType,
} from '@lexical/rich-text';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  $isListNode,
} from '@lexical/list';
import { $setBlocksType } from '@lexical/selection';
import {
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
} from 'lexical';

// Material-UI Icons
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import CodeIcon from '@mui/icons-material/Code';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

const LowPriority = 1;

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
  onClick, 
  active = false, 
  disabled = false, 
  children, 
  title 
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      p-2 rounded-md transition-all duration-200 
      flex items-center justify-center
      ${active 
        ? 'bg-orange-100 text-orange-600 shadow-sm' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }
      ${disabled 
        ? 'opacity-50 cursor-not-allowed' 
        : 'cursor-pointer'
      }
    `}
  >
    {children}
  </button>
);

const Divider: React.FC = () => (
  <div className="w-px h-6 bg-gray-300 mx-1" />
);

const RichTextToolbar: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  
  // Format states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update text format states
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));

      // Update block type
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = element;
          const type = parentList.getListType();
          setBlockType(type);
        } else {
          const type = element.getType();
          if (type in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
            setBlockType(type);
          } else if (type === 'quote') {
            setBlockType('quote');
          } else {
            setBlockType('paragraph');
          }
        }
      }
    }
  }, [activeEditor]);

  useEffect(() => {
    return activeEditor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        updateToolbar();
        setActiveEditor(newEditor);
        return false;
      },
      LowPriority
    );
  }, [activeEditor, updateToolbar]);

  useEffect(() => {
    return activeEditor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [activeEditor, updateToolbar]);

  // Undo/Redo capability tracking
  useEffect(() => {
    return activeEditor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload: boolean) => {
        setCanUndo(payload);
        return false;
      },
      LowPriority
    );
  }, [activeEditor]);

  useEffect(() => {
    return activeEditor.registerCommand(
      CAN_REDO_COMMAND,
      (payload: boolean) => {
        setCanRedo(payload);
        return false;
      },
      LowPriority
    );
  }, [activeEditor]);

  const formatText = useCallback(
    (format: string) => {
      activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [activeEditor]
  );

  const formatHeading = useCallback(
    (headingType: HeadingTagType) => {
      if (blockType !== headingType) {
        activeEditor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode(headingType));
          }
        });
      }
    },
    [activeEditor, blockType]
  );

  const formatParagraph = useCallback(() => {
    if (blockType !== 'paragraph') {
      activeEditor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    }
  }, [activeEditor, blockType]);

  const formatQuote = useCallback(() => {
    if (blockType !== 'quote') {
      activeEditor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      });
    }
  }, [activeEditor, blockType]);

  const formatBulletList = useCallback(() => {
    if (blockType !== 'bullet') {
      activeEditor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    }
  }, [activeEditor, blockType]);

  const formatNumberedList = useCallback(() => {
    if (blockType !== 'number') {
      activeEditor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  }, [activeEditor, blockType]);

  return (
    <div className="toolbar border-b border-gray-300 p-2 bg-gray-50 rounded-t-lg">
      <div className="flex items-center space-x-1">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => activeEditor.dispatchCommand(UNDO_COMMAND, undefined)}
          disabled={!canUndo}
          title="元に戻す (Ctrl+Z)"
        >
          <UndoIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => activeEditor.dispatchCommand(REDO_COMMAND, undefined)}
          disabled={!canRedo}
          title="やり直し (Ctrl+Y)"
        >
          <RedoIcon fontSize="small" />
        </ToolbarButton>
        
        <Divider />

        {/* Block Type Selector */}
        <select
          className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
          value={blockType}
          onChange={(e) => {
            const value = e.target.value;
            switch (value) {
              case 'paragraph':
                formatParagraph();
                break;
              case 'h1':
              case 'h2':
              case 'h3':
              case 'h4':
              case 'h5':
              case 'h6':
                formatHeading(value as HeadingTagType);
                break;
              case 'quote':
                formatQuote();
                break;
            }
          }}
        >
          <option value="paragraph">段落</option>
          <option value="h1">見出し 1</option>
          <option value="h2">見出し 2</option>
          <option value="h3">見出し 3</option>
          <option value="h4">見出し 4</option>
          <option value="h5">見出し 5</option>
          <option value="h6">見出し 6</option>
          <option value="quote">引用</option>
        </select>

        <Divider />

        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => formatText('bold')}
          active={isBold}
          title="太字 (Ctrl+B)"
        >
          <FormatBoldIcon fontSize="small" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => formatText('italic')}
          active={isItalic}
          title="斜体 (Ctrl+I)"
        >
          <FormatItalicIcon fontSize="small" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => formatText('underline')}
          active={isUnderline}
          title="下線 (Ctrl+U)"
        >
          <FormatUnderlinedIcon fontSize="small" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => formatText('strikethrough')}
          active={isStrikethrough}
          title="取り消し線"
        >
          <StrikethroughSIcon fontSize="small" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => formatText('code')}
          active={isCode}
          title="コード (Ctrl+`)"
        >
          <CodeIcon fontSize="small" />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={formatBulletList}
          active={blockType === 'bullet'}
          title="箇条書き"
        >
          <FormatListBulletedIcon fontSize="small" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={formatNumberedList}
          active={blockType === 'number'}
          title="番号付きリスト"
        >
          <FormatListNumberedIcon fontSize="small" />
        </ToolbarButton>

        <Divider />

        {/* Quote */}
        <ToolbarButton
          onClick={formatQuote}
          active={blockType === 'quote'}
          title="引用"
        >
          <FormatQuoteIcon fontSize="small" />
        </ToolbarButton>
      </div>
    </div>
  );
};

export default RichTextToolbar;