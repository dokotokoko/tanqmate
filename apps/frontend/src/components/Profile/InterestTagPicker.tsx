import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormHelperText,
  Stack,
  TextField,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { colors } from '../../styles/design-system';

export const INTEREST_SUGGESTIONS = [
  'スポーツ',
  '音楽',
  'ゲーム',
  'アニメ',
  '動画',
  '料理',
  'ファッション',
  '生き物',
  '環境',
  '地域',
  'テクノロジー',
  'AI',
  '宇宙',
  '歴史',
  '心理',
  '教育',
  '医療',
  '建築',
  'ビジネス',
  '社会問題',
];

const MAX_TAG_LENGTH = 24;

interface InterestTagPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  showSuggestions?: boolean;
}

const normalizeTag = (tag: string) => tag.trim();

const InterestTagPicker: React.FC<InterestTagPickerProps> = ({
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  showSuggestions = true,
}) => {
  const [draft, setDraft] = useState('');
  const [inputError, setInputError] = useState('');

  const selected = useMemo(
    () => value.map(normalizeTag).filter(Boolean).filter((tag, index, tags) => tags.indexOf(tag) === index),
    [value]
  );
  const customSelected = selected.filter((tag) => !INTEREST_SUGGESTIONS.includes(tag));
  const deletableTags = showSuggestions ? customSelected : selected;

  const updateTags = (nextTags: string[]) => {
    onChange(nextTags.map(normalizeTag).filter(Boolean).filter((tag, index, tags) => tags.indexOf(tag) === index));
  };

  const addTag = (tag: string) => {
    const nextTag = normalizeTag(tag);
    setInputError('');

    if (!nextTag) {
      return;
    }

    if (nextTag.length > MAX_TAG_LENGTH) {
      setInputError(`興味は${MAX_TAG_LENGTH}文字以内で入力してください`);
      return;
    }

    if (selected.includes(nextTag)) {
      setDraft('');
      return;
    }

    updateTags([...selected, nextTag]);
    setDraft('');
  };

  const removeTag = (tag: string) => {
    updateTags(selected.filter((item) => item !== tag));
  };

  const toggleSuggestion = (tag: string) => {
    if (selected.includes(tag)) {
      removeTag(tag);
    } else {
      addTag(tag);
    }
  };

  const handleSubmit = () => {
    addTag(draft);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', rowGap: 1.75, columnGap: 1.25 }}>
        {showSuggestions &&
          INTEREST_SUGGESTIONS.map((tag) => {
            const isSelected = selected.includes(tag);
            return (
              <Chip
                key={tag}
                label={tag}
                clickable
                disabled={disabled}
                onClick={() => toggleSuggestion(tag)}
                variant={isSelected ? 'filled' : 'outlined'}
                sx={{
                  height: 44,
                  fontSize: 15,
                  px: 0.5,
                  borderRadius: '22px',
                  borderColor: isSelected ? colors.border.warm : colors.border.soft,
                  backgroundColor: isSelected ? colors.accentWarm.soft : colors.background.paper,
                  color: isSelected ? colors.accentWarm.active : colors.text.secondary,
                  fontWeight: isSelected ? 600 : 400,
                  '&:hover': {
                    backgroundColor: isSelected ? colors.accentWarm.soft : colors.background.subtle,
                  },
                }}
              />
            );
          })}
        {deletableTags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            onDelete={disabled ? undefined : () => removeTag(tag)}
            sx={{
              height: 44,
              fontSize: 15,
              px: 0.5,
              borderRadius: '22px',
              border: `1px solid ${colors.border.warm}`,
              backgroundColor: colors.accentWarm.soft,
              color: colors.accentWarm.active,
              fontWeight: 600,
              '&:hover': {
                backgroundColor: colors.accentWarm.soft,
              },
            }}
          />
        ))}
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3.5 }}>
        <TextField
          fullWidth
          size="small"
          label="好きなもの・気になるものを追加"
          value={draft}
          disabled={disabled}
          error={Boolean(inputError)}
          helperText={inputError || '例：猫、駅、睡眠、ボードゲーム'}
          onChange={(event) => {
            setDraft(event.target.value);
            if (inputError) {
              setInputError('');
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={handleSubmit}
          disabled={disabled || !draft.trim()}
          sx={{ minWidth: { xs: '100%', sm: 112 } }}
        >
          追加
        </Button>
      </Stack>

      {(error || helperText) && (
        <FormHelperText error={Boolean(error)} sx={{ mt: 1 }}>
          {error || helperText}
        </FormHelperText>
      )}
    </Box>
  );
};

export default InterestTagPicker;
