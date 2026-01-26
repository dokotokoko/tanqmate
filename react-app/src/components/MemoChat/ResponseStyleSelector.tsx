import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  TextField,
  useTheme,
} from '@mui/material';
import {
  Psychology,
  School,
  EmojiObjects,
  Extension,
  Science,
  Speed,
  MenuBook,
  Edit as EditIcon,
  Check,
  Settings,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

export interface ResponseStyle {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  prompts?: string[]; // オプショナルなプロンプト例
  customInstruction?: string; // カスタムスタイル用の指示
}

interface ResponseStyleSelectorProps {
  selectedStyle: ResponseStyle | null;
  onStyleChange: (style: ResponseStyle) => void;
}

// 利用可能な応答スタイル
const responseStyles: ResponseStyle[] = [
  {
    id: 'organize',
    label: '考えを整理する',
    description: '思考を整理して構造化する',
    icon: <Psychology />,
    color: 'primary',
    prompts: ['考えを整理して', '構造化して説明して'],
  },
  {
    id: 'research',
    label: '情報を調べたい',
    description: '詳しい情報や資料を調べる',
    icon: <MenuBook />,
    color: 'info',
    prompts: ['詳しく調べて', '情報を教えて'],
  },
  {
    id: 'ideas',
    label: 'アイデアが欲しい',
    description: '創造的なアイデアを提案',
    icon: <EmojiObjects />,
    color: 'warning',
    prompts: ['アイデアを出して', '創造的に考えて'],
  },
  {
    id: 'deepen',
    label: '考えを深めたい',
    description: 'より深く掘り下げて考察',
    icon: <Science />,
    color: 'success',
    prompts: ['深く考察して', '掘り下げて分析して'],
  },
  {
    id: 'expand',
    label: '考えを広げたい',
    description: '視野を広げて多角的に検討',
    icon: <Extension />,
    color: 'secondary',
    prompts: ['視野を広げて', '多角的に考えて'],
  },
  {
    id: 'select',
    label: 'サクサク進める',
    description: 'クリックだけで探究が進む',
    icon: <Speed />,
    color: 'success',
    prompts: ['次に何をすればいい？', '小さな一歩を教えて'],
  },
  {
    id: 'custom',
    label: 'カスタム',
    description: '自分で応答スタイルを指定',
    icon: <EditIcon />,
    color: 'error',
  },
];

const ResponseStyleSelector: React.FC<ResponseStyleSelectorProps> = ({
  selectedStyle,
  onStyleChange,
}) => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    // トグルをONにした時、選択されていなければデフォルトスタイルを自動選択
    if (newIsOpen && !selectedStyle) {
      onStyleChange(responseStyles[0]); // デフォルトは「考えを整理する」
    }
  };

  const handleStyleSelect = (style: ResponseStyle) => {
    console.log('🎨 ResponseStyleSelector: スタイル選択', style.id, style.label);
    if (style.id === 'custom') {
      // カスタムスタイルの場合はインライン入力を表示
      setShowCustomInput(true);
      setCustomInstruction(selectedStyle?.customInstruction || '');
    } else {
      console.log('🎨 ResponseStyleSelector: onStyleChange呼び出し', style.id);
      onStyleChange(style);
      setShowCustomInput(false);
      // スタイル選択後は自動で閉じる
      setTimeout(() => setIsOpen(false), 300);
    }
  };

  const handleCustomStyleConfirm = () => {
    if (!customInstruction.trim()) return;
    
    const customStyle: ResponseStyle = {
      id: 'custom',
      label: 'カスタム',
      description: customInstruction.substring(0, 50) + (customInstruction.length > 50 ? '...' : ''),
      icon: <EditIcon />,
      color: 'secondary',
      customInstruction: customInstruction,
    };
    onStyleChange(customStyle);
    setShowCustomInput(false);
    setTimeout(() => setIsOpen(false), 300);
  };

  const handleCustomStyleCancel = () => {
    setShowCustomInput(false);
    setCustomInstruction('');
  };

  // デフォルトスタイル（簡潔）を設定
  const currentStyle = selectedStyle || responseStyles[0];

  const smoothEase = [0.4, 0, 0.2, 1]

  return (
    <Box sx={{ width: '100%' }}>
      {/* トグルスイッチとスタイル表示 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: isOpen ? 1 : 0,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: { xs: 1, sm: 0 },
        }}
      >
        <Box
          onClick={handleToggle}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.75, sm: 1 },
            cursor: 'pointer',
            userSelect: 'none',
            minWidth: 0,
            flex: { xs: '1 1 auto', sm: '0 0 auto' },
          }}
        >
          {/* カスタムトグルスイッチ */}
          <Box
            sx={{
              width: { xs: 40, sm: 44 },
              height: { xs: 22, sm: 24 },
              backgroundColor: isOpen ? theme.palette.primary.main : '#e5e7eb',
              borderRadius: { xs: '11px', sm: '12px' },
              position: 'relative',
              transition: 'background-color 0.3s ease',
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: { xs: 18, sm: 20 },
                height: { xs: 18, sm: 20 },
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: 2,
                left: 2,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isOpen 
                  ? { xs: 'translateX(18px)', sm: 'translateX(20px)' }
                  : 'translateX(0px)',
              }}
            />
          </Box>
          
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500, 
              color: 'text.primary',
              fontSize: { xs: '14px', sm: '15px' },
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            応答スタイルを選択する
          </Typography>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            textAlign: { xs: 'left', sm: 'right' },
            fontSize: { xs: '11px', sm: '12px' },
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: { xs: '100%', sm: '200px' },
            order: { xs: 2, sm: 0 },
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {currentStyle.label}: {currentStyle.description}
        </Typography>
      </Box>

      {/* スタイル選択パネル */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ 
              maxHeight: 0, 
              opacity: 0, 
              marginBottom: 0 
            }}
            animate={{ 
              maxHeight: 400, 
              opacity: 1, 
              marginBottom: 16 
            }}
            exit={{ 
              maxHeight: 0, 
              opacity: 0, 
              marginBottom: 0 
            }}
            transition={{ 
              maxHeight: { 
                duration: 0.3, 
                delay: isOpen ? 0 : 0,  // 閉じるときに遅延
                ease: smoothEase
              },
              opacity: {  
                duration: 0,
                delay: isOpen ? 0.1 : 0,  // 開くときに遅延
                ease: smoothEase
              },
              marginBottom: { 
                duration: 0.3,
                delay: isOpen ? 0 : 0,
                ease: smoothEase
              }
            }}
            style={{ 
              overflow: 'hidden'
            }}
          >
            <Paper
              elevation={1}
              sx={{
                p: 2,
                borderRadius: 1.4,
                backgroundColor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: { xs: 0.75, sm: 1 },
                    flex: 1,
                  }}
                >
                  {responseStyles.map((style) => (
                    <Button
                      key={style.id}
                      onClick={() => handleStyleSelect(style)}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: { xs: 0.5, sm: 0.75 },
                        py: { xs: 0.75, sm: 1 },
                        px: { xs: 1.25, sm: 1.75 },
                        backgroundColor: style.id === 'custom' 
                          ? 'transparent' 
                          : (currentStyle.id === style.id ? '#eff6ff' : '#f9fafb'),
                        border: style.id === 'custom' 
                          ? '1px dashed #9ca3af' 
                          : `1px solid ${currentStyle.id === style.id ? '#93c5fd' : '#e5e7eb'}`,
                        borderRadius: '14px',
                        cursor: 'pointer',
                        position: 'relative',
                        textTransform: 'none',
                        minWidth: 'auto',
                        color: style.id === 'custom' ? '#9ca3af' : '#374151',
                        transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
                        '&:hover': {
                          backgroundColor: style.id === 'custom' 
                            ? 'rgba(0, 0, 0, 0.04)' 
                            : '#f3f4f6',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                          borderColor: style.id === 'custom' ? '#6b7280' : undefined,
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                        },
                      }}
                    >
                      {/* アイコン */}
                      <Box sx={{ 
                        fontSize: { xs: 14, sm: 16 }, 
                        display: 'flex', 
                        alignItems: 'center',
                        flexShrink: 0
                      }}>
                        {style.icon}
                      </Box>
                      
                      {/* ラベル */}
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: { xs: 12, sm: 14 },
                          color: style.id === 'custom' ? '#9ca3af' : '#374151',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {style.label}
                      </Typography>
                      
                      {/* チェックバッジ */}
                      {currentStyle.id === style.id && style.id !== 'custom' && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 30,
                            mass: 0.8
                          }}
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            width: 18,
                            height: 18,
                            backgroundColor: theme.palette.primary.main,
                            color: 'white',
                            borderRadius: '50%',
                            fontSize: 10,
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check sx={{ fontSize: 10 }} />
                        </motion.div>
                      )}
                    </Button>
                  ))}
                </Box>
                
                <Button
                  size="small"
                  sx={{
                    minWidth: 'auto',
                    color: '#9ca3af',
                    p: 1,
                    '&:hover': {
                      color: '#6b7280',
                    },
                  }}
                >
                  <Settings sx={{ fontSize: 20 }} />
                </Button>
              </Box>

              {/* カスタムスタイル入力エリア */}
              <AnimatePresence>
                {showCustomInput && (
                  <motion.div
                    initial={{ 
                      maxHeight: 0, 
                      opacity: 0 
                    }}
                    animate={{ 
                      maxHeight: 200, 
                      opacity: 1 
                    }}
                    exit={{ 
                      maxHeight: 0, 
                      opacity: 0 
                    }}
                    transition={{ 
                      maxHeight: { 
                        duration: 0.3, 
                        delay: showCustomInput ? 0 : 0.1,
                        ease: [0.4, 0, 0.2, 1]
                      },
                      opacity: { 
                        duration: 0.2,
                        delay: showCustomInput ? 0.1 : 0,
                        ease: "easeOut"
                      }
                    }}
                    style={{ 
                      overflow: 'hidden'
                    }}
                  >
                    <Box 
                      sx={{ 
                        mt: 2, 
                        pt: 2, 
                        borderTop: '1px solid #e5e7eb'
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ 
                          mb: 1, 
                          display: 'block',
                          fontSize: 12
                        }}
                      >
                        カスタムスタイルを指定してください
                      </Typography>
                      <TextField
                        autoFocus
                        size="small"
                        fullWidth
                        variant="outlined"
                        placeholder="例：小学生にもわかるように優しく説明して"
                        value={customInstruction}
                        onChange={(e) => setCustomInstruction(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleCustomStyleConfirm();
                          }
                        }}
                        sx={{ 
                          mb: 1,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.05,
                            fontSize: 14,
                          }
                        }}
                      />
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button 
                          size="small" 
                          onClick={handleCustomStyleCancel}
                          sx={{
                            color: '#6b7280',
                            textTransform: 'none',
                            fontSize: 12,
                            minWidth: 'auto',
                            px: 1.5,
                            py: 0.5,
                          }}
                        >
                          キャンセル
                        </Button>
                        <Button 
                          size="small"
                          variant="contained"
                          onClick={handleCustomStyleConfirm}
                          disabled={!customInstruction.trim()}
                          sx={{
                            textTransform: 'none',
                            fontSize: 12,
                            borderRadius: 1.05,
                            px: 1.5,
                            py: 0.5,
                          }}
                        >
                          設定
                        </Button>
                      </Stack>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>

            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default ResponseStyleSelector;