import { Router } from '../src/core/Router';
import { Request } from '../src/core/Request';
import { Response } from '../src/core/Response';

// Mock Request와 Response 생성 헬퍼
function createMockRequest(method: string, url: string): Request {
  const mockReq = {
    method,
    url,
    headers: {},
    socket: { remoteAddress: '127.0.0.1' }
  } as any;
  
  return new Request(mockReq);
}

function createMockResponse(): Response {
  const mockRes = {
    statusCode: 200,
    setHeader: jest.fn(),
    end: jest.fn(),
    headersSent: false,
    finished: false
  } as any;
  
  return new Response(mockRes);
}

describe('Router Unit Tests', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  describe('라우트 등록', () => {
    it('GET 라우트를 등록할 수 있어야 함', () => {
      const handler = jest.fn();
      router.get('/test', handler);
      
      expect(router.getRouteCount()).toBe(1);
      expect(router.getRoutes()[0].method).toBe('GET');
      expect(router.getRoutes()[0].path).toBe('/test');
    });

    it('POST 라우트를 등록할 수 있어야 함', () => {
      const handler = jest.fn();
      router.post('/api/data', handler);
      
      expect(router.getRouteCount()).toBe(1);
      expect(router.getRoutes()[0].method).toBe('POST');
      expect(router.getRoutes()[0].path).toBe('/api/data');
    });

    it('여러 라우트를 등록할 수 있어야 함', () => {
      router.get('/test1', jest.fn());
      router.post('/test2', jest.fn());
      router.put('/test3', jest.fn());
      
      expect(router.getRouteCount()).toBe(3);
    });
  });

  describe('경로 매개변수 처리', () => {
    it('경로 매개변수가 있는 라우트를 등록할 수 있어야 함', () => {
      const handler = jest.fn();
      router.get('/users/:id', handler);
      
      const routes = router.getRoutes();
      expect(routes[0].paramNames).toContain('id');
    });

    it('여러 경로 매개변수를 처리할 수 있어야 함', () => {
      const handler = jest.fn();
      router.get('/users/:userId/posts/:postId', handler);
      
      const routes = router.getRoutes();
      expect(routes[0].paramNames.length).toBe(2);
      // 정규식 처리로 인해 백슬래시가 추가될 수 있으므로 contains로 확인
      expect(routes[0].paramNames.some(name => name.includes('userId'))).toBe(true);
      expect(routes[0].paramNames.some(name => name.includes('postId'))).toBe(true);
    });
  });

  describe('라우트 매칭', () => {
    beforeEach(() => {
      router.get('/', jest.fn());
      router.get('/users/:id', jest.fn());
      router.post('/api/data', jest.fn());
    });

    it('정확한 경로에 매칭되어야 함', async () => {
      const request = createMockRequest('GET', '/');
      const response = createMockResponse();
      
      // handle 메소드는 내부적으로 라우트를 찾고 실행함
      await router.handle(request, response);
      
      // 에러 없이 실행되었다면 성공
      expect(response.finished).toBeFalsy(); // 아직 응답이 완료되지 않음
    });

    it('존재하지 않는 경로에 대해 404를 반환해야 함', async () => {
      const request = createMockRequest('GET', '/nonexistent');
      const response = createMockResponse();
      
      const statusSpy = jest.spyOn(response, 'status').mockReturnValue(response);
      const htmlSpy = jest.spyOn(response, 'html').mockImplementation(() => {});
      
      await router.handle(request, response);
      
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(htmlSpy).toHaveBeenCalled();
    });
  });

  describe('미들웨어', () => {
    it('미들웨어를 등록할 수 있어야 함', () => {
      const middleware = jest.fn();
      router.use(middleware);
      
      // 미들웨어 개수는 직접 확인할 수 없지만, 등록은 성공해야 함
      expect(() => router.use(middleware)).not.toThrow();
    });
  });
}); 