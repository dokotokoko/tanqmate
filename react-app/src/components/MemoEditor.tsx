import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import { Box, useTheme, useMediaQuery, IconButton, Tooltip, Typography } from '@mui/material';
import { Save as SaveIcon, TextFormat as TextFormatIcon } from '@mui/icons-material';
import LexicalEditor from './RichTextEditor/LexicalEditor';
import { EditorState } from 'lexical';

interface MemoEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  onSave: (content: string) => void;
  placeholder?: string;
}

const MemoEditor: React.FC<MemoEditorProps> = memo(({
  initialContent,
  onContentChange,
  onSave,
  placeholder
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // リッチテキストモードとプレーンテキストモードの切り替え
  const [isRichTextMode, setIsRichTextMode] = useState(() => {
    // localStorageから設定を読み込み
    const saved = localStorage.getItem('memo-editor-mode');
    return saved ? saved === 'rich' : true; // デフォルトはリッチテキストモード
  });
  
  // 遅延初期化でstateを設定（再マウント時に自動的に初期化される）
  const [content, setContent] = useState(() => initialContent);
  const [plainTextContent, setPlainTextContent] = useState(() => initialContent);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const currentContentRef = useRef(initialContent);

  // エディタモードの切り替え
  const toggleEditorMode = useCallback(() => {
    const newMode = !isRichTextMode;
    setIsRichTextMode(newMode);
    localStorage.setItem('memo-editor-mode', newMode ? 'rich' : 'plain');
  }, [isRichTextMode]);

  // Lexical エディタからのコンテンツ変更
  const handleLexicalChange = useCallback((textContent: string, editorState: EditorState) => {
    currentContentRef.current = textContent;
    setContent(textContent);
    
    // 親コンポーネントに通知
    onContentChange(textContent);
    
    // 未保存フラグを設定
    if (textContent !== initialContent) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [onContentChange, initialContent]);

  // プレーンテキストエディタからのコンテンツ変更
  const handlePlainTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    currentContentRef.current = newContent;
    setPlainTextContent(newContent);
    
    // 親コンポーネントに通知
    onContentChange(newContent);
    
    // 未保存フラグを設定
    if (newContent !== initialContent) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [onContentChange, initialContent]);
  
  // 手動保存
  const handleSave = useCallback(() => {
    if (hasUnsavedChanges) {
      const currentContent = currentContentRef.current;
      onSave(currentContent);
      setHasUnsavedChanges(false);
    }
  }, [onSave, hasUnsavedChanges]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      handleSave();
    }
  }, [handleSave]);
  
  // ページ離脱時の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '保存されていない変更があります。本当にページを離れますか？';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
  
  return (
    <Box sx={{ 
      flex: 1,
      overflow: 'auto',
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* ツールバー */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        minHeight: '40px'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color={hasUnsavedChanges ? 'warning.main' : 'success.main'}>
            {hasUnsavedChanges ? '未保存の変更があります' : '保存済み'}
          </Typography>
          
          <Tooltip title={isRichTextMode ? "プレーンテキストモードに切り替え" : "リッチテキストモードに切り替え"} arrow>
            <IconButton 
              onClick={toggleEditorMode} 
              size="small" 
              color={isRichTextMode ? "primary" : "default"}
            >
              <TextFormatIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Tooltip title={hasUnsavedChanges ? "保存 (Ctrl+S)" : "変更なし"} arrow>
          <span>
            <IconButton 
              onClick={handleSave} 
              size="small" 
              color={hasUnsavedChanges ? "primary" : "default"}
              disabled={!hasUnsavedChanges}
            >
              <SaveIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      
      {/* エディタ */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }} onKeyDown={handleKeyDown}>
        {isRichTextMode ? (
          <LexicalEditor
            key={`lexical-${initialContent}`}
            content={initialContent}
            onChange={handleLexicalChange}
            placeholder={placeholder}
            className="flex-1"
            autoFocus={true}
          />
        ) : (
          <textarea
            value={plainTextContent}
            onChange={handlePlainTextChange}
            placeholder={placeholder}
            className="flex-1 w-full p-4 border border-gray-300 rounded-lg resize-none outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            style={{
              fontFamily: '"Noto Sans JP", "Roboto", "Helvetica", "Arial", sans-serif',
              fontSize: '14px',
              lineHeight: '1.5',
              minHeight: isMobile ? '400px' : '500px'
            }}
          />
        )}
      </Box>

      {/* エディタモード説明 */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {isRichTextMode 
            ? 'リッチテキストモード: 見出し、太字、箇条書きなどの書式設定が可能です' 
            : 'プレーンテキストモード: シンプルなテキスト編集'
          }
        </Typography>
      </Box>
    </Box>
  );
});

MemoEditor.displayName = 'MemoEditor';

export default MemoEditor;