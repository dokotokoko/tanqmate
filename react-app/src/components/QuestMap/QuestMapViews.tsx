import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Avatar,
  Divider,
  Collapse,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuestNode, QuestEdge, NodeType, NodeStatus } from '../../types/questMap';

interface ViewFilters {
  search: string;
  nodeType: NodeType | 'all';
  status: NodeStatus | 'all';
  isRecommended: 'all' | 'recommended' | 'not-recommended';
  difficulty: 'all' | '1' | '2' | '3' | '4' | '5';
  sortBy: 'title' | 'type' | 'status' | 'difficulty' | 'created' | 'updated';
  sortOrder: 'asc' | 'desc';
}

interface QuestMapViewsProps {
  nodes: QuestNode[];
  edges: QuestEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onNodeAction: (nodeId: string, action: 'view' | 'edit' | 'delete' | 'start' | 'complete') => void;
  viewMode: 'list' | 'grid' | 'compact';
  showMinimap?: boolean;
  onMinimapNodeClick?: (nodeId: string) => void;
}

// ノードタイプ別アイコンとラベル
const NODE_TYPE_CONFIG = {
  [NodeType.CURRENT]: { icon: '📍', label: '現在', color: '#2E7D32' },
  [NodeType.CHOICE]: { icon: '🤔', label: '選択肢', color: '#1976D2' },
  [NodeType.FUTURE]: { icon: '🔮', label: '将来', color: '#F57C00' },
  [NodeType.GOAL]: { icon: '🎯', label: 'ゴール', color: '#C62828' },
};

// ステータス別設定
const STATUS_CONFIG = {
  [NodeStatus.NOT_STARTED]: { icon: <ScheduleIcon />, label: '未開始', color: '#757575' },
  [NodeStatus.IN_PROGRESS]: { icon: <PlayIcon />, label: '進行中', color: '#FF9800' },
  [NodeStatus.COMPLETED]: { icon: <CheckCircleIcon />, label: '完了', color: '#4CAF50' },
};

const QuestMapViews: React.FC<QuestMapViewsProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onNodeAction,
  viewMode,
  showMinimap = true,
  onMinimapNodeClick,
}) => {
  const theme = useTheme();
  const [filters, setFilters] = useState<ViewFilters>({
    search: '',
    nodeType: 'all',
    status: 'all',
    isRecommended: 'all',
    difficulty: 'all',
    sortBy: 'title',
    sortOrder: 'asc',
  });
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // フィルタリングとソート
  const filteredAndSortedNodes = useCallback(() => {
    let filtered = nodes.filter(node => {
      // 検索フィルター
      if (filters.search && !node.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          !node.description?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // タイプフィルター
      if (filters.nodeType !== 'all' && node.type !== filters.nodeType) {
        return false;
      }

      // ステータスフィルター
      if (filters.status !== 'all' && node.status !== filters.status) {
        return false;
      }

      // 推奨フィルター
      if (filters.isRecommended === 'recommended' && !node.isRecommended) {
        return false;
      }
      if (filters.isRecommended === 'not-recommended' && node.isRecommended) {
        return false;
      }

      // 難易度フィルター
      if (filters.difficulty !== 'all' && node.difficulty?.toString() !== filters.difficulty) {
        return false;
      }

      return true;
    });

    // ソート
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'difficulty':
          aValue = a.difficulty || 0;
          bValue = b.difficulty || 0;
          break;
        case 'created':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        case 'updated':
          aValue = new Date(a.updatedAt || 0);
          bValue = new Date(b.updatedAt || 0);
          break;
        default:
          aValue = a.title;
          bValue = b.title;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [nodes, filters]);

  const handleFilterChange = (key: keyof ViewFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      nodeType: 'all',
      status: 'all',
      isRecommended: 'all',
      difficulty: 'all',
      sortBy: 'title',
      sortOrder: 'asc',
    });
  };

  const toggleExpanded = (nodeId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // ミニマップコンポーネント
  const Minimap = () => {
    const minimapRef = useRef<HTMLDivElement>(null);
    const canvasSize = 200;
    const nodeSize = 6;

    if (!showMinimap || nodes.length === 0) return null;

    // ノードの位置を正規化
    const bounds = nodes.reduce((acc, node) => {
      if (!node.position) return acc;
      return {
        minX: Math.min(acc.minX, node.position.x),
        maxX: Math.max(acc.maxX, node.position.x),
        minY: Math.min(acc.minY, node.position.y),
        maxY: Math.max(acc.maxY, node.position.y),
      };
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

    const normalizePosition = (x: number, y: number) => {
      const width = bounds.maxX - bounds.minX || 1;
      const height = bounds.maxY - bounds.minY || 1;
      return {
        x: ((x - bounds.minX) / width) * (canvasSize - nodeSize * 2) + nodeSize,
        y: ((y - bounds.minY) / height) * (canvasSize - nodeSize * 2) + nodeSize,
      };
    };

    return (
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: canvasSize + 20,
          height: canvasSize + 40,
          p: 1,
          backgroundColor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(10px)',
          zIndex: 10,
        }}
      >
        <Typography variant="caption" sx={{ display: 'block', mb: 1, textAlign: 'center' }}>
          ミニマップ
        </Typography>
        <Box
          ref={minimapRef}
          sx={{
            width: canvasSize,
            height: canvasSize,
            position: 'relative',
            backgroundColor: alpha(theme.palette.background.default, 0.5),
            borderRadius: 1,
            overflow: 'hidden',
            cursor: 'pointer',
          }}
        >
          {/* エッジ */}
          <svg
            width={canvasSize}
            height={canvasSize}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            {edges.map(edge => {
              const sourceNode = nodes.find(n => n.id === edge.sourceId);
              const targetNode = nodes.find(n => n.id === edge.targetId);
              
              if (!sourceNode?.position || !targetNode?.position) return null;
              
              const source = normalizePosition(sourceNode.position.x, sourceNode.position.y);
              const target = normalizePosition(targetNode.position.x, targetNode.position.y);
              
              return (
                <line
                  key={edge.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={alpha(theme.palette.text.secondary, 0.3)}
                  strokeWidth={1}
                />
              );
            })}
          </svg>

          {/* ノード */}
          {nodes.map(node => {
            if (!node.position) return null;
            
            const pos = normalizePosition(node.position.x, node.position.y);
            const config = NODE_TYPE_CONFIG[node.type];
            
            return (
              <Box
                key={node.id}
                onClick={() => onMinimapNodeClick?.(node.id)}
                sx={{
                  position: 'absolute',
                  left: pos.x - nodeSize / 2,
                  top: pos.y - nodeSize / 2,
                  width: nodeSize,
                  height: nodeSize,
                  borderRadius: '50%',
                  backgroundColor: config.color,
                  border: selectedNodeId === node.id ? `2px solid ${theme.palette.primary.main}` : 'none',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'scale(1.2)',
                  },
                  transition: 'transform 0.2s',
                }}
                title={node.title}
              />
            );
          })}
        </Box>
      </Paper>
    );
  };

  // リスト表示
  const ListView = () => (
    <List sx={{ width: '100%' }}>
      <AnimatePresence>
        {filteredAndSortedNodes().map((node, index) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
          >
            <ListItem
              disablePadding
              sx={{
                mb: 1,
                border: selectedNodeId === node.id ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
                borderRadius: 1,
                backgroundColor: selectedNodeId === node.id 
                  ? alpha(theme.palette.primary.main, 0.1)
                  : theme.palette.background.paper,
              }}
            >
              <ListItemButton
                onClick={() => onNodeSelect(node.id)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon>
                  <Avatar
                    sx={{
                      backgroundColor: NODE_TYPE_CONFIG[node.type].color,
                      color: 'white',
                      width: 40,
                      height: 40,
                    }}
                  >
                    {NODE_TYPE_CONFIG[node.type].icon}
                  </Avatar>
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ flex: 1 }}>
                        {node.title}
                      </Typography>
                      {node.isRecommended && (
                        <Badge badgeContent="推奨" color="warning" />
                      )}
                      <Chip
                        size="small"
                        label={NODE_TYPE_CONFIG[node.type].label}
                        sx={{
                          backgroundColor: alpha(NODE_TYPE_CONFIG[node.type].color, 0.1),
                          color: NODE_TYPE_CONFIG[node.type].color,
                        }}
                      />
                      <Chip
                        size="small"
                        icon={STATUS_CONFIG[node.status].icon}
                        label={STATUS_CONFIG[node.status].label}
                        sx={{
                          backgroundColor: alpha(STATUS_CONFIG[node.status].color, 0.1),
                          color: STATUS_CONFIG[node.status].color,
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      {node.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {node.description.substring(0, 100)}
                          {node.description.length > 100 && '...'}
                        </Typography>
                      )}
                      {node.difficulty && (
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            難易度: {'★'.repeat(node.difficulty)}{'☆'.repeat(5 - node.difficulty)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
                
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(node.id);
                  }}
                >
                  {expandedItems.has(node.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </ListItemButton>
            </ListItem>

            <Collapse in={expandedItems.has(node.id)} timeout="auto" unmountOnExit>
              <Box sx={{ pl: 8, pr: 2, pb: 2 }}>
                {node.description && (
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {node.description}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onNodeAction(node.id, 'view')}
                  >
                    詳細表示
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onNodeAction(node.id, 'edit')}
                  >
                    編集
                  </Button>
                  {node.status === NodeStatus.NOT_STARTED && (
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={() => onNodeAction(node.id, 'start')}
                    >
                      開始
                    </Button>
                  )}
                  {node.status === NodeStatus.IN_PROGRESS && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => onNodeAction(node.id, 'complete')}
                    >
                      完了
                    </Button>
                  )}
                </Box>
              </Box>
            </Collapse>
          </motion.div>
        ))}
      </AnimatePresence>
    </List>
  );

  // グリッド表示
  const GridView = () => (
    <Grid container spacing={2}>
      <AnimatePresence>
        {filteredAndSortedNodes().map((node, index) => (
          <Grid item xs={12} sm={6} md={4} key={node.id}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  border: selectedNodeId === node.id ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
                  '&:hover': {
                    boxShadow: theme.shadows[4],
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s',
                }}
                onClick={() => onNodeSelect(node.id)}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      sx={{
                        backgroundColor: NODE_TYPE_CONFIG[node.type].color,
                        color: 'white',
                        mr: 2,
                      }}
                    >
                      {NODE_TYPE_CONFIG[node.type].icon}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="div" sx={{ fontSize: '1rem' }}>
                        {node.title}
                      </Typography>
                      {node.isRecommended && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <StarIcon sx={{ fontSize: '1rem', color: 'gold', mr: 0.5 }} />
                          <Typography variant="caption" color="warning.main">
                            AI推奨
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {node.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {node.description.substring(0, 80)}
                      {node.description.length > 80 && '...'}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip
                      size="small"
                      label={NODE_TYPE_CONFIG[node.type].label}
                      sx={{
                        backgroundColor: alpha(NODE_TYPE_CONFIG[node.type].color, 0.1),
                        color: NODE_TYPE_CONFIG[node.type].color,
                      }}
                    />
                    <Chip
                      size="small"
                      icon={STATUS_CONFIG[node.status].icon}
                      label={STATUS_CONFIG[node.status].label}
                      sx={{
                        backgroundColor: alpha(STATUS_CONFIG[node.status].color, 0.1),
                        color: STATUS_CONFIG[node.status].color,
                      }}
                    />
                  </Box>

                  {node.difficulty && (
                    <Typography variant="caption" color="text.secondary">
                      難易度: {'★'.repeat(node.difficulty)}{'☆'.repeat(5 - node.difficulty)}
                    </Typography>
                  )}
                </CardContent>

                <CardActions>
                  <Button size="small" onClick={(e) => {
                    e.stopPropagation();
                    onNodeAction(node.id, 'view');
                  }}>
                    詳細
                  </Button>
                  {node.status === NodeStatus.NOT_STARTED && (
                    <Button size="small" color="primary" onClick={(e) => {
                      e.stopPropagation();
                      onNodeAction(node.id, 'start');
                    }}>
                      開始
                    </Button>
                  )}
                  {node.status === NodeStatus.IN_PROGRESS && (
                    <Button size="small" color="success" onClick={(e) => {
                      e.stopPropagation();
                      onNodeAction(node.id, 'complete');
                    }}>
                      完了
                    </Button>
                  )}
                </CardActions>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </AnimatePresence>
    </Grid>
  );

  // コンパクト表示
  const CompactView = () => (
    <List dense>
      <AnimatePresence>
        {filteredAndSortedNodes().map((node, index) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.03 }}
          >
            <ListItemButton
              selected={selectedNodeId === node.id}
              onClick={() => onNodeSelect(node.id)}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: NODE_TYPE_CONFIG[node.type].color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                  }}
                >
                  {NODE_TYPE_CONFIG[node.type].icon}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={node.title}
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {STATUS_CONFIG[node.status].icon}
                    <Typography variant="caption">
                      {STATUS_CONFIG[node.status].label}
                    </Typography>
                    {node.isRecommended && (
                      <StarIcon sx={{ fontSize: '0.8rem', color: 'gold' }} />
                    )}
                  </Box>
                }
              />
            </ListItemButton>
          </motion.div>
        ))}
      </AnimatePresence>
    </List>
  );

  return (
    <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* フィルター・検索バー */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: showFilters ? 2 : 0 }}>
          <TextField
            size="small"
            placeholder="クエストを検索..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: filters.search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => handleFilterChange('search', '')}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />
          
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            フィルター
          </Button>
          
          {Object.values(filters).some(v => v !== 'all' && v !== '' && v !== 'title' && v !== 'asc') && (
            <Button size="small" onClick={clearFilters}>
              クリア
            </Button>
          )}
        </Box>

        <Collapse in={showFilters}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>タイプ</InputLabel>
                <Select
                  value={filters.nodeType}
                  onChange={(e) => handleFilterChange('nodeType', e.target.value)}
                  label="タイプ"
                >
                  <MenuItem value="all">すべて</MenuItem>
                  {Object.entries(NodeType).map(([key, value]) => (
                    <MenuItem key={value} value={value}>
                      {NODE_TYPE_CONFIG[value].icon} {NODE_TYPE_CONFIG[value].label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="ステータス"
                >
                  <MenuItem value="all">すべて</MenuItem>
                  {Object.entries(NodeStatus).map(([key, value]) => (
                    <MenuItem key={value} value={value}>
                      {STATUS_CONFIG[value].icon} {STATUS_CONFIG[value].label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>推奨</InputLabel>
                <Select
                  value={filters.isRecommended}
                  onChange={(e) => handleFilterChange('isRecommended', e.target.value)}
                  label="推奨"
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="recommended">推奨のみ</MenuItem>
                  <MenuItem value="not-recommended">推奨以外</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>並び順</InputLabel>
                <Select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-') as [ViewFilters['sortBy'], ViewFilters['sortOrder']];
                    handleFilterChange('sortBy', sortBy);
                    handleFilterChange('sortOrder', sortOrder);
                  }}
                  label="並び順"
                >
                  <MenuItem value="title-asc">タイトル (昇順)</MenuItem>
                  <MenuItem value="title-desc">タイトル (降順)</MenuItem>
                  <MenuItem value="type-asc">タイプ (昇順)</MenuItem>
                  <MenuItem value="type-desc">タイプ (降順)</MenuItem>
                  <MenuItem value="status-asc">ステータス (昇順)</MenuItem>
                  <MenuItem value="status-desc">ステータス (降順)</MenuItem>
                  <MenuItem value="difficulty-asc">難易度 (昇順)</MenuItem>
                  <MenuItem value="difficulty-desc">難易度 (降順)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* 結果表示 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {filteredAndSortedNodes().length} / {nodes.length} クエスト
        </Typography>

        {viewMode === 'list' && <ListView />}
        {viewMode === 'grid' && <GridView />}
        {viewMode === 'compact' && <CompactView />}
      </Box>

      {/* ミニマップ */}
      <Minimap />
    </Box>
  );
};

export default QuestMapViews;