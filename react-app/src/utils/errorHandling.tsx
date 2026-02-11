// src/utils/errorHandling.tsx - 包括的エラーハンドリングシステム
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Alert, Button, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'

// エラーの種類定義
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHORIZATION = 'AUTHORIZATION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

// エラー詳細情報
export interface ErrorDetails {
  type: ErrorType
  message: string
  code?: string | number
  statusCode?: number
  timestamp: Date
  userAgent: string
  url: string
  userId?: string
  questId?: number
  component?: string
  action?: string
  metadata?: Record<string, any>
  stack?: string
}

// エラー分類器
export class ErrorClassifier {
  static classify(error: Error | any): ErrorType {
    // ネットワークエラー
    if (
      error.name === 'NetworkError' ||
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.code === 'ECONNABORTED'
    ) {
      return ErrorType.NETWORK
    }

    // 認証・認可エラー
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.message?.includes('Unauthorized') ||
      error.message?.includes('Forbidden')
    ) {
      return ErrorType.AUTHORIZATION
    }

    // バリデーションエラー
    if (
      error.status === 400 ||
      error.status === 422 ||
      error.name === 'ValidationError' ||
      error.message?.includes('validation')
    ) {
      return ErrorType.VALIDATION
    }

    // サーバーエラー
    if (
      error.status >= 500 ||
      error.name === 'ServerError' ||
      error.message?.includes('server')
    ) {
      return ErrorType.SERVER
    }

    // クライアントエラー
    if (
      error.status >= 400 && error.status < 500 ||
      error.name === 'TypeError' ||
      error.name === 'ReferenceError'
    ) {
      return ErrorType.CLIENT
    }

    return ErrorType.UNKNOWN
  }

  static createErrorDetails(
    error: Error | any,
    context: {
      component?: string
      action?: string
      userId?: string
      questId?: number
      metadata?: Record<string, any>
    } = {}
  ): ErrorDetails {
    const type = this.classify(error)
    
    return {
      type,
      message: error.message || 'Unknown error',
      code: error.code || error.status,
      statusCode: error.status,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: error.stack,
      ...context
    }
  }
}

// エラーログ送信サービス
export class ErrorReporter {
  private static instance: ErrorReporter
  private queue: ErrorDetails[] = []
  private isOnline = navigator.onLine
  private maxQueueSize = 100
  private batchSize = 10
  private flushInterval = 30000 // 30秒

  constructor() {
    this.setupEventListeners()
    this.startPeriodicFlush()
  }

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter()
    }
    return ErrorReporter.instance
  }

  private setupEventListeners(): void {
    // オンライン/オフライン状態の監視
    window.addEventListener('online', () => {
      this.isOnline = true
      this.flush()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    // 未処理の例外をキャッチ
    window.addEventListener('error', (event) => {
      this.report(ErrorClassifier.createErrorDetails(
        new Error(event.message),
        {
          component: 'window',
          action: 'unhandled_error',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        }
      ))
    })

    // Promise のリジェクションをキャッチ
    window.addEventListener('unhandledrejection', (event) => {
      this.report(ErrorClassifier.createErrorDetails(
        new Error(event.reason),
        {
          component: 'window',
          action: 'unhandled_promise_rejection'
        }
      ))
    })
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      if (this.queue.length > 0 && this.isOnline) {
        this.flush()
      }
    }, this.flushInterval)
  }

  report(errorDetails: ErrorDetails): void {
    // キューに追加
    this.queue.push(errorDetails)

    // キューサイズ制限
    if (this.queue.length > this.maxQueueSize) {
      this.queue = this.queue.slice(-this.maxQueueSize)
    }

    // 即座に送信（重要なエラーの場合）
    if (this.shouldFlushImmediately(errorDetails) && this.isOnline) {
      this.flush()
    }

    // コンソールにも出力（開発環境）
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Reported: ${errorDetails.type}`)
      console.error('Message:', errorDetails.message)
      console.error('Details:', errorDetails)
      if (errorDetails.stack) {
        console.error('Stack:', errorDetails.stack)
      }
      console.groupEnd()
    }
  }

  private shouldFlushImmediately(errorDetails: ErrorDetails): boolean {
    return (
      errorDetails.type === ErrorType.SERVER ||
      errorDetails.type === ErrorType.AUTHORIZATION ||
      errorDetails.statusCode === 500
    )
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0 || !this.isOnline) {
      return
    }

    const batch = this.queue.splice(0, this.batchSize)

    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ errors: batch }),
      })
    } catch (error) {
      // 送信失敗時は再度キューに戻す
      this.queue.unshift(...batch)
      console.warn('Failed to send error reports:', error)
    }
  }

  // 手動フラッシュ
  async forceFlush(): Promise<void> {
    await this.flush()
  }

  // 統計情報
  getStats() {
    return {
      queueSize: this.queue.length,
      isOnline: this.isOnline,
      maxQueueSize: this.maxQueueSize
    }
  }
}

// エラーメッセージの多言語化
export class ErrorMessageFormatter {
  private static messages: Record<ErrorType, Record<string, string>> = {
    [ErrorType.NETWORK]: {
      title: 'ネットワークエラー',
      message: 'インターネット接続を確認してください',
      action: '再試行'
    },
    [ErrorType.VALIDATION]: {
      title: '入力エラー',
      message: '入力内容を確認して修正してください',
      action: '修正する'
    },
    [ErrorType.AUTHORIZATION]: {
      title: '認証エラー',
      message: 'ログインが必要です',
      action: 'ログイン'
    },
    [ErrorType.SERVER]: {
      title: 'サーバーエラー',
      message: 'サーバーで問題が発生しました。時間をおいて再試行してください',
      action: '再試行'
    },
    [ErrorType.CLIENT]: {
      title: 'アプリケーションエラー',
      message: 'アプリケーションで問題が発生しました',
      action: 'リロード'
    },
    [ErrorType.UNKNOWN]: {
      title: '不明なエラー',
      message: '予期しない問題が発生しました',
      action: 'リロード'
    }
  }

  static format(errorDetails: ErrorDetails): {
    title: string
    message: string
    action: string
  } {
    const template = this.messages[errorDetails.type]
    
    return {
      title: template.title,
      message: errorDetails.message || template.message,
      action: template.action
    }
  }

  static getSeverity(errorType: ErrorType): 'error' | 'warning' | 'info' {
    switch (errorType) {
      case ErrorType.SERVER:
      case ErrorType.CLIENT:
        return 'error'
      case ErrorType.NETWORK:
      case ErrorType.AUTHORIZATION:
        return 'warning'
      default:
        return 'info'
    }
  }
}

// グローバルエラーバウンダリー
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorDetails?: ErrorDetails
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

export class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private reporter: ErrorReporter

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
    this.reporter = ErrorReporter.getInstance()
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラー詳細を作成
    const errorDetails = ErrorClassifier.createErrorDetails(error, {
      component: 'ErrorBoundary',
      action: 'component_error',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    })

    this.setState({ errorInfo, errorDetails })

    // エラーレポーターに送信
    this.reporter.report(errorDetails)

    // コールバック実行
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorDetails: undefined })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReportIssue = () => {
    const { errorDetails } = this.state
    if (errorDetails) {
      // GitHub Issues や問題報告フォームを開く
      const body = encodeURIComponent(`
エラーレポート

エラータイプ: ${errorDetails.type}
メッセージ: ${errorDetails.message}
発生時刻: ${errorDetails.timestamp.toISOString()}
URL: ${errorDetails.url}
User Agent: ${errorDetails.userAgent}

${errorDetails.stack ? `スタックトレース:\n${errorDetails.stack}` : ''}
      `)
      
      window.open(`https://github.com/your-repo/issues/new?title=Error%20Report&body=${body}`, '_blank')
    }
  }

  render() {
    if (this.state.hasError) {
      const { error, errorDetails } = this.state
      const { fallback: Fallback, showDetails = true } = this.props

      // カスタムフォールバックが提供されている場合
      if (Fallback) {
        return <Fallback error={error!} retry={this.handleRetry} />
      }

      // デフォルトエラーUI
      const formattedError = errorDetails 
        ? ErrorMessageFormatter.format(errorDetails)
        : { title: 'エラーが発生しました', message: error?.message || '不明なエラー', action: '再試行' }

      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="400px"
          p={4}
          textAlign="center"
          maxWidth="600px"
          margin="0 auto"
        >
          <Alert 
            severity={errorDetails ? ErrorMessageFormatter.getSeverity(errorDetails.type) : 'error'}
            sx={{ width: '100%', mb: 3 }}
          >
            <Typography variant="h6" gutterBottom>
              {formattedError.title}
            </Typography>
            <Typography variant="body2">
              {formattedError.message}
            </Typography>
          </Alert>

          <Box display="flex" gap={2} mb={showDetails ? 3 : 0}>
            <Button
              variant="contained"
              color="primary"
              onClick={this.handleRetry}
            >
              {formattedError.action}
            </Button>
            
            <Button
              variant="outlined"
              onClick={this.handleReload}
            >
              ページをリロード
            </Button>
            
            <Button
              variant="text"
              size="small"
              onClick={this.handleReportIssue}
            >
              問題を報告
            </Button>
          </Box>

          {showDetails && errorDetails && process.env.NODE_ENV === 'development' && (
            <Accordion sx={{ width: '100%', mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">エラー詳細（開発用）</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box component="pre" sx={{ 
                  fontSize: '12px', 
                  overflow: 'auto', 
                  backgroundColor: '#f5f5f5',
                  p: 2,
                  borderRadius: 1
                }}>
                  {JSON.stringify(errorDetails, null, 2)}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )
    }

    return this.props.children
  }
}

// エラーハンドリングフック
export const useErrorHandler = (context: { component: string; action?: string }) => {
  const reporter = React.useMemo(() => ErrorReporter.getInstance(), [])

  return React.useCallback((error: Error | any, additionalContext?: Record<string, any>) => {
    const errorDetails = ErrorClassifier.createErrorDetails(error, {
      ...context,
      metadata: additionalContext
    })
    
    reporter.report(errorDetails)
    
    // UI でのエラー表示など、必要に応じて追加の処理
    return errorDetails
  }, [reporter, context])
}

// API エラーハンドラー
export class ApiErrorHandler {
  private static instance: ApiErrorHandler
  private reporter: ErrorReporter

  constructor() {
    this.reporter = ErrorReporter.getInstance()
  }

  static getInstance(): ApiErrorHandler {
    if (!ApiErrorHandler.instance) {
      ApiErrorHandler.instance = new ApiErrorHandler()
    }
    return ApiErrorHandler.instance
  }

  async handleResponse(response: Response, context: { action: string; questId?: number }): Promise<Response> {
    if (!response.ok) {
      const errorDetails = ErrorClassifier.createErrorDetails(
        new Error(`HTTP ${response.status}: ${response.statusText}`),
        {
          component: 'API',
          action: context.action,
          questId: context.questId,
          metadata: {
            url: response.url,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          }
        }
      )
      
      this.reporter.report(errorDetails)
      
      // 具体的なエラー内容を取得
      try {
        const errorBody = await response.clone().json()
        throw new Error(errorBody.message || errorDetails.message)
      } catch {
        throw new Error(errorDetails.message)
      }
    }
    
    return response
  }

  handleError(error: Error | any, context: { action: string; questId?: number }): never {
    const errorDetails = ErrorClassifier.createErrorDetails(error, {
      component: 'API',
      ...context
    })
    
    this.reporter.report(errorDetails)
    throw error
  }
}

export const apiErrorHandler = ApiErrorHandler.getInstance()

// QuestMap 専用エラーハンドラー
export const useQuestMapErrorHandler = (questId?: number) => {
  return useErrorHandler({
    component: 'QuestMap',
    questId
  })
}