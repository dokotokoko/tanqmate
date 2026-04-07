import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Chip,
} from '@mui/material';
import {
  Person,
  School,
  CheckCircle,
  ExpandMore,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStoreV2 } from '../stores/authStoreV2';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStoreV2();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    schoolCode: '',
    grade: '',
    className: '',
    attendanceNumber: '',
  });

  const [formErrors, setFormErrors] = useState({
    name: '',
    schoolCode: '',
    grade: '',
    className: '',
    attendanceNumber: '',
  });

  const [schoolInfo, setSchoolInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showClassInfo, setShowClassInfo] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    }
  }, [user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSchoolCodeInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    handleInputChange(e);

    // 学校コードが6文字入力されたら自動で検証
    if (code.length >= 6) {
      await verifySchoolCode(code);
    } else {
      setShowClassInfo(false);
      setSchoolInfo(null);
    }
  };

  const verifySchoolCode = async (code: string) => {
    setIsVerifyingCode(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('school_code', code)
        .single();

      if (error || !data) {
        setFormErrors(prev => ({ ...prev, schoolCode: '学校コードが正しくありません' }));
        setShowClassInfo(false);
        setSchoolInfo(null);
      } else {
        setSchoolInfo(data);
        setShowClassInfo(true);
        setFormErrors(prev => ({ ...prev, schoolCode: '' }));
      }
    } catch (err) {
      console.error('School code verification error:', err);
      setFormErrors(prev => ({ ...prev, schoolCode: 'エラーが発生しました' }));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const validateForm = () => {
    const errors = {
      name: '',
      schoolCode: '',
      grade: '',
      className: '',
      attendanceNumber: '',
    };

    if (!formData.name.trim()) {
      errors.name = '名前を入力してください';
    }

    if (showClassInfo) {
      if (!formData.grade) {
        errors.grade = '学年を選択してください';
      }
      if (!formData.className.trim()) {
        errors.className = 'クラスを入力してください';
      }
      if (!formData.attendanceNumber) {
        errors.attendanceNumber = '出席番号を入力してください';
      }
    }

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updateData: any = {
        name: formData.name,
      };

      if (schoolInfo) {
        updateData.school_id = schoolInfo.id;
        updateData.school_code_locked = true;
        updateData.grade = formData.grade;
        updateData.class_name = formData.className;
        updateData.attendance_number = parseInt(formData.attendanceNumber);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      
      // roleを取得して適切なページへリダイレクト
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();
      
      setTimeout(() => {
        if (updatedProfile?.role === 'teacher') {
          navigate('/teacher');
        } else {
          navigate('/signup/complete');
        }
      }, 1500);
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError('プロフィールの更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 3,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <Paper elevation={3} sx={{ p: 4 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Typography
                component="h1"
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                プロフィール設定
              </Typography>
              <Typography variant="body2" color="text.secondary">
                あなたの情報を入力してください
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                プロフィールを設定しました！
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="名前"
                name="name"
                autoComplete="name"
                autoFocus
                value={formData.name}
                onChange={handleInputChange}
                error={!!formErrors.name}
                helperText={formErrors.name}
                InputProps={{
                  startAdornment: <Person color="action" sx={{ mr: 1 }} />,
                }}
              />

              <TextField
                margin="normal"
                fullWidth
                id="schoolCode"
                label="学校コード（任意）"
                name="schoolCode"
                value={formData.schoolCode}
                onChange={handleSchoolCodeInput}
                error={!!formErrors.schoolCode}
                helperText={formErrors.schoolCode || '学校から配布されたコードを入力'}
                InputProps={{
                  startAdornment: <School color="action" sx={{ mr: 1 }} />,
                  endAdornment: isVerifyingCode && <CircularProgress size={20} />,
                }}
              />

              {schoolInfo && (
                <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 1, mb: 2 }}>
                  <Typography variant="body2">
                    <strong>{schoolInfo.name}</strong>が確認されました
                  </Typography>
                </Alert>
              )}

              <AnimatePresence>
                {showClassInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        クラス情報を入力してください
                      </Typography>

                      <FormControl fullWidth margin="normal" error={!!formErrors.grade}>
                        <InputLabel id="grade-label">学年</InputLabel>
                        <Select
                          labelId="grade-label"
                          id="grade"
                          name="grade"
                          value={formData.grade}
                          label="学年"
                          onChange={handleInputChange}
                        >
                          <MenuItem value="1年">1年</MenuItem>
                          <MenuItem value="2年">2年</MenuItem>
                          <MenuItem value="3年">3年</MenuItem>
                        </Select>
                        {formErrors.grade && (
                          <Typography variant="caption" color="error">
                            {formErrors.grade}
                          </Typography>
                        )}
                      </FormControl>

                      <TextField
                        margin="normal"
                        fullWidth
                        id="className"
                        label="クラス（例：1組、A組）"
                        name="className"
                        value={formData.className}
                        onChange={handleInputChange}
                        error={!!formErrors.className}
                        helperText={formErrors.className}
                      />

                      <TextField
                        margin="normal"
                        fullWidth
                        id="attendanceNumber"
                        label="出席番号"
                        name="attendanceNumber"
                        type="number"
                        value={formData.attendanceNumber}
                        onChange={handleInputChange}
                        error={!!formErrors.attendanceNumber}
                        helperText={formErrors.attendanceNumber}
                        inputProps={{ min: 1, max: 50 }}
                      />
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  mb: 2,
                  background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                  },
                }}
                disabled={isLoading || success}
              >
                {isLoading ? <CircularProgress size={24} /> : '登録する'}
              </Button>

              {!formData.schoolCode && (
                <Typography variant="body2" color="text.secondary" align="center">
                  学校コードは後からでも設定できます
                </Typography>
              )}
            </Box>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default OnboardingPage;