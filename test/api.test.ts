import request from 'supertest';
import { Server } from '../src/core/Server';

describe('My TypeScript WAS API Tests', () => {
  let server: Server;
  let app: any;

  // 테스트 전에 서버 시작
  beforeAll(async () => {
    server = new Server(0); // 랜덤 포트 사용
    server.start();
    
    // private 멤버에 접근 (테스트용)
    app = (server as any).httpServer;
    
    // 서버가 실제로 시작될 때까지 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  // 테스트 후 서버 종료
  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('GET /', () => {
    it('홈페이지 HTML 응답을 반환해야 함', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('Welcome to My TypeScript WAS!');
      expect(response.text).toContain('서버가 성공적으로 실행되고 있습니다');
    });
  });

  describe('GET /api/health', () => {
    it('서버 상태 JSON을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('method', 'GET');
      expect(response.body).toHaveProperty('path', '/api/health');
      expect(response.body).toHaveProperty('routes');
      expect(typeof response.body.routes).toBe('number');
    });
  });

  describe('GET /users/:id', () => {
    it('경로 매개변수가 포함된 사용자 정보 JSON을 반환해야 함', async () => {
      const userId = '123';
      const response = await request(app)
        .get(`/users/${userId}`)
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body).toHaveProperty('message', '사용자 정보');
      expect(response.body).toHaveProperty('userId', userId);
      expect(response.body).toHaveProperty('clientIP');
      // userAgent는 있을 수도 없을 수도 있음
    });
  });

  describe('GET /hello', () => {
    it('기본 인사말을 반환해야 함', async () => {
      const response = await request(app)
        .get('/hello')
        .expect(200)
        .expect('Content-Type', /text\/plain/);

      expect(response.text).toBe('Hello, World! 🎉');
    });

    it('쿼리 파라미터가 있을 때 맞춤 인사말을 반환해야 함', async () => {
      const name = 'TypeScript';
      const response = await request(app)
        .get('/hello?name=' + encodeURIComponent(name))
        .expect(200)
        .expect('Content-Type', /text\/plain/);

      expect(response.text).toBe(`Hello, ${name}! 🎉`);
    });
  });

  describe('POST /api/echo', () => {
    it('요청 본문을 에코해야 함', async () => {
      const testData = { message: 'Hello Test!', number: 42 };
      
      const response = await request(app)
        .post('/api/echo')
        .send(testData)
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body).toHaveProperty('message', '요청 본문을 그대로 반환합니다');
      expect(response.body).toHaveProperty('originalBody');
      expect(response.body).toHaveProperty('contentType');
      expect(response.body).toHaveProperty('contentLength');
      
      // 원본 데이터가 JSON 문자열로 포함되어 있는지 확인
      const originalBodyParsed = JSON.parse(response.body.originalBody);
      expect(originalBodyParsed).toEqual(testData);
    });
  });

  describe('404 Error Handling', () => {
    it('존재하지 않는 경로에 대해 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/존재하지않는경로')
        .expect(404);

      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('404 - Page Not Found');
      expect(response.text).toContain('Method: <strong>GET</strong>');
      // URL 인코딩된 경로도 포함되는지 확인
      expect(response.text).toContain('EC%A1%B4%EC%9E%AC%ED%95%98%EC%A7%80%EC%95%8A%EB%8A%94%EA%B2%BD%EB%A1%9C');
    });
  });
}); 