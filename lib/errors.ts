/**
 * 커스텀 에러 클래스 정의
 * 
 * 애플리케이션에서 발생할 수 있는 다양한 에러 타입을 정의하여
 * 에러 핸들링을 더 정확하고 일관성 있게 처리할 수 있습니다.
 */

/**
 * 기본 애플리케이션 에러 클래스
 * 모든 커스텀 에러의 부모 클래스
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * 네트워크 연결 실패 에러
 * 예: 인터넷 연결 끊김, 서버 응답 없음
 */
export class NetworkError extends AppError {
  constructor(message: string = '네트워크 연결을 확인해주세요') {
    super(message, 'NETWORK_ERROR', 503);
    this.name = 'NetworkError';
  }
}

/**
 * 입력 검증 실패 에러
 * 예: 빈 내용, 너무 긴 텍스트, 잘못된 형식
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

/**
 * 데이터를 찾을 수 없는 에러
 * 예: 존재하지 않는 메모 ID
 */
export class NotFoundError extends AppError {
  constructor(message: string = '요청한 데이터를 찾을 수 없습니다') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 인증 실패 에러
 * 예: 로그인 필요, 권한 없음
 */
export class AuthenticationError extends AppError {
  constructor(message: string = '로그인이 필요합니다') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * 권한 부족 에러
 * 예: 다른 사용자의 메모 수정 시도
 */
export class AuthorizationError extends AppError {
  constructor(message: string = '이 작업을 수행할 권한이 없습니다') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * 데이터베이스 에러
 * 예: Supabase 쿼리 실패
 */
export class DatabaseError extends AppError {
  constructor(message: string = '데이터베이스 작업 중 오류가 발생했습니다') {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
  }
}

/**
 * 에러 타입 확인 헬퍼 함수들
 * TypeScript 타입 가드로 사용
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * 에러 메시지 포맷팅 함수
 * 사용자에게 보여줄 친화적인 에러 메시지로 변환
 */
export function formatErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return '알 수 없는 오류가 발생했습니다';
}

/**
 * 에러 로깅 함수
 * 향후 Sentry 등 에러 추적 서비스와 연동 가능
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  // 개발 환경에서는 콘솔에 출력
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error);
    if (context) {
      console.error('Context:', context);
    }
  }
  
  // 프로덕션 환경에서는 에러 추적 서비스로 전송
  // 예: Sentry.captureException(error, { extra: context });
}
