import { Request } from './Request';
import { Response } from './Response';

/**
 * HTTP 메소드 타입 정의
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 라우트 핸들러 함수 타입
 * @param request 요청 객체
 * @param response 응답 객체
 * @param params 경로 매개변수 (예: /users/:id에서 {id: "123"})
 */
export type RouteHandler = (
  request: Request,
  response: Response,
  params?: Record<string, string>
) => Promise<void> | void;

/**
 * 라우트 정의 인터페이스
 */
export interface RouteDefinition {
  /** HTTP 메소드 */
  method: HttpMethod;
  /** 경로 패턴 (예: "/users/:id", "/api/posts") */
  path: string;
  /** 핸들러 함수 */
  handler: RouteHandler;
  /** 경로 매개변수를 위한 정규식 패턴 (내부적으로 생성) */
  pattern?: RegExp;
  /** 매개변수 이름 목록 (내부적으로 생성) */
  paramNames?: string[];
}

/**
 * 라우트 매칭 결과
 */
export interface RouteMatch {
  /** 매칭된 라우트 정의 */
  route: RouteDefinition;
  /** 추출된 경로 매개변수 */
  params: Record<string, string>;
}

/**
 * 개별 라우트를 나타내는 클래스
 */
export class Route implements RouteDefinition {
  public readonly method: HttpMethod;
  public readonly path: string;
  public readonly handler: RouteHandler;
  public readonly pattern: RegExp;
  public readonly paramNames: string[];

  constructor(method: HttpMethod, path: string, handler: RouteHandler) {
    this.method = method;
    this.path = path;
    this.handler = handler;

    // 경로 패턴을 정규식으로 변환
    const { pattern, paramNames } = this.createPattern(path);
    this.pattern = pattern;
    this.paramNames = paramNames;
  }

  /**
   * 경로 패턴을 정규식으로 변환
   * 예: "/users/:id/posts/:postId" → /^\/users\/([^\/]+)\/posts\/([^\/]+)$/
   */
  private createPattern(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    
    // :param 형태의 매개변수를 ([^\/]+)로 변환
    const regexPattern = path
      .replace(/\//g, '\\/') // 슬래시 이스케이프
      .replace(/:([^\/]+)/g, (match, paramName) => {
        paramNames.push(paramName);
        return '([^\\/]+)'; // 슬래시가 아닌 문자들과 매칭
      });

    return {
      pattern: new RegExp(`^${regexPattern}$`),
      paramNames
    };
  }

  /**
   * 주어진 경로가 이 라우트와 매칭되는지 확인
   * @param path 확인할 경로
   * @returns 매칭 결과 또는 null
   */
  public match(path: string): Record<string, string> | null {
    const matches = this.pattern.exec(path);
    if (!matches) {
      return null;
    }

    // 매개변수 추출
    const params: Record<string, string> = {};
    for (let i = 0; i < this.paramNames.length; i++) {
      params[this.paramNames[i]] = matches[i + 1];
    }

    return params;
  }
} 