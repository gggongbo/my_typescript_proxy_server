import { Request } from './Request';
import { Response } from './Response';
import { Route, RouteHandler, HttpMethod, RouteMatch } from './Route';

/**
 * 미들웨어 함수 타입
 */
export type MiddlewareHandler = (
  request: Request,
  response: Response,
  next: () => void
) => Promise<void> | void;

/**
 * 라우팅 시스템의 핵심 클래스
 * HTTP 요청을 적절한 핸들러로 라우팅하는 기능을 제공
 */
export class Router {
  private routes: Route[] = [];
  private middlewares: MiddlewareHandler[] = [];

  /**
   * GET 요청 라우트 등록
   * @param path 경로 패턴
   * @param handler 핸들러 함수
   */
  public get(path: string, handler: RouteHandler): Router {
    return this.addRoute('GET', path, handler);
  }

  /**
   * POST 요청 라우트 등록
   * @param path 경로 패턴
   * @param handler 핸들러 함수
   */
  public post(path: string, handler: RouteHandler): Router {
    return this.addRoute('POST', path, handler);
  }

  /**
   * PUT 요청 라우트 등록
   * @param path 경로 패턴
   * @param handler 핸들러 함수
   */
  public put(path: string, handler: RouteHandler): Router {
    return this.addRoute('PUT', path, handler);
  }

  /**
   * DELETE 요청 라우트 등록
   * @param path 경로 패턴
   * @param handler 핸들러 함수
   */
  public delete(path: string, handler: RouteHandler): Router {
    return this.addRoute('DELETE', path, handler);
  }

  /**
   * PATCH 요청 라우트 등록
   * @param path 경로 패턴
   * @param handler 핸들러 함수
   */
  public patch(path: string, handler: RouteHandler): Router {
    return this.addRoute('PATCH', path, handler);
  }

  /**
   * 모든 HTTP 메소드에 대한 라우트 등록
   * @param path 경로 패턴
   * @param handler 핸들러 함수
   */
  public all(path: string, handler: RouteHandler): Router {
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    methods.forEach(method => this.addRoute(method, path, handler));
    return this;
  }

  /**
   * 미들웨어 등록
   * @param middleware 미들웨어 함수
   */
  public use(middleware: MiddlewareHandler): Router {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * 라우트 추가 (내부 메소드)
   * @param method HTTP 메소드
   * @param path 경로 패턴
   * @param handler 핸들러 함수
   */
  private addRoute(method: HttpMethod, path: string, handler: RouteHandler): Router {
    const route = new Route(method, path, handler);
    this.routes.push(route);
    return this;
  }

  /**
   * 요청에 매칭되는 라우트 찾기
   * @param method HTTP 메소드
   * @param path 요청 경로
   * @returns 매칭된 라우트 또는 null
   */
  private findRoute(method: string, path: string): RouteMatch | null {
    for (const route of this.routes) {
      if (route.method === method) {
        const params = route.match(path);
        if (params !== null) {
          return { route, params };
        }
      }
    }
    return null;
  }

  /**
   * 미들웨어 체인 실행
   * @param request 요청 객체
   * @param response 응답 객체
   * @param middlewares 실행할 미들웨어 배열
   * @param index 현재 미들웨어 인덱스
   */
  private async executeMiddlewares(
    request: Request,
    response: Response,
    middlewares: MiddlewareHandler[],
    index: number = 0
  ): Promise<void> {
    if (index >= middlewares.length) {
      return; // 모든 미들웨어 실행 완료
    }

    const middleware = middlewares[index];
    let nextCalled = false;

    const next = () => {
      if (nextCalled) {
        throw new Error('next() called multiple times');
      }
      nextCalled = true;
      // 다음 미들웨어 실행
      this.executeMiddlewares(request, response, middlewares, index + 1);
    };

    try {
      await middleware(request, response, next);
      
      // next()가 호출되지 않은 경우 (응답 완료 등)
      if (!nextCalled) {
        return;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 요청 처리 (메인 라우팅 로직)
   * @param request 요청 객체
   * @param response 응답 객체
   */
  public async handle(request: Request, response: Response): Promise<void> {
    try {
      // 1. 미들웨어 실행
      if (this.middlewares.length > 0) {
        let middlewareCompleted = false;
        const middlewareWithRouting = [...this.middlewares];
        
        // 라우팅을 마지막 미들웨어로 추가
        middlewareWithRouting.push(async (req, res, next) => {
          await this.executeRouting(req, res);
          middlewareCompleted = true;
        });

        await this.executeMiddlewares(request, response, middlewareWithRouting);
        
        if (middlewareCompleted) {
          return;
        }
      } else {
        // 미들웨어가 없으면 바로 라우팅 실행
        await this.executeRouting(request, response);
      }
    } catch (error) {
      // 에러 처리
      console.error('Router error:', error);
      if (!response.finished) {
        response.status(500).text('Internal Server Error');
      }
    }
  }

  /**
   * 라우팅 실행 (내부 메소드)
   * @param request 요청 객체
   * @param response 응답 객체
   */
  private async executeRouting(request: Request, response: Response): Promise<void> {
    // 매칭되는 라우트 찾기
    const match = this.findRoute(request.method, request.path);
    
    if (match) {
      // 라우트 핸들러 실행
      await match.route.handler(request, response, match.params);
    } else {
      // 404 Not Found
      this.handle404(request, response);
    }
  }

  /**
   * 404 에러 처리
   * @param request 요청 객체
   * @param response 응답 객체
   */
  private handle404(request: Request, response: Response): void {
    response.status(404).html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>404 - Page Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            h1 { color: #e74c3c; }
            p { color: #7f8c8d; }
            .path { font-family: monospace; background: #f8f9fa; padding: 4px 8px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>404 - Page Not Found</h1>
          <p>The requested path <span class="path">${request.path}</span> was not found on this server.</p>
          <p>Method: <strong>${request.method}</strong></p>
        </body>
      </html>
    `);
  }

  /**
   * 등록된 모든 라우트 정보 조회 (디버깅용)
   */
  public getRoutes(): Route[] {
    return [...this.routes];
  }

  /**
   * 라우트 개수 조회
   */
  public getRouteCount(): number {
    return this.routes.length;
  }
} 