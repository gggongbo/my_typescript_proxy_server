import { Request } from '../core/Request';
import { Response } from '../core/Response';
import * as crypto from 'crypto';

/**
 * 세션 데이터 인터페이스
 */
export interface SessionData {
  id: string;
  userId?: string;
  username?: string;
  authorities?: string[];
  attributes: Record<string, any>;
  createdAt: Date;
  lastAccessedAt: Date;
  maxInactiveInterval: number; // 초 단위
}

/**
 * 세션 저장소 인터페이스
 */
export interface SessionStore {
  get(sessionId: string): Promise<SessionData | null>;
  set(sessionId: string, sessionData: SessionData): Promise<void>;
  delete(sessionId: string): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * 메모리 기반 세션 저장소 (개발용)
 */
export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, SessionData>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 5분마다 만료된 세션 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // 세션 만료 체크
    const now = new Date();
    const expiryTime = new Date(session.lastAccessedAt.getTime() + session.maxInactiveInterval * 1000);
    if (now > expiryTime) {
      this.sessions.delete(sessionId);
      return null;
    }

    // 마지막 접근 시간 업데이트
    session.lastAccessedAt = now;
    return session;
  }

  async set(sessionId: string, sessionData: SessionData): Promise<void> {
    this.sessions.set(sessionId, sessionData);
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const expiryTime = new Date(session.lastAccessedAt.getTime() + session.maxInactiveInterval * 1000);
      if (now > expiryTime) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      console.log(`[SessionManager] Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }
}

/**
 * Redis 기반 세션 저장소 (프로덕션용, 구조만 제공)
 */
export class RedisSessionStore implements SessionStore {
  private redisClient: any; // Redis 클라이언트 (redis 라이브러리 필요)

  constructor(redisClient: any) {
    this.redisClient = redisClient;
  }

  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const data = await this.redisClient.get(`session:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[RedisSessionStore] Error getting session:', error);
      return null;
    }
  }

  async set(sessionId: string, sessionData: SessionData): Promise<void> {
    try {
      await this.redisClient.setex(
        `session:${sessionId}`,
        sessionData.maxInactiveInterval,
        JSON.stringify(sessionData)
      );
    } catch (error) {
      console.error('[RedisSessionStore] Error setting session:', error);
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      await this.redisClient.del(`session:${sessionId}`);
    } catch (error) {
      console.error('[RedisSessionStore] Error deleting session:', error);
    }
  }

  async cleanup(): Promise<void> {
    // Redis는 TTL로 자동 만료되므로 별도 정리 불필요
  }
}

/**
 * 세션 관리자 설정
 */
export interface SessionManagerConfig {
  cookieName: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number; // 쿠키 최대 수명 (초)
  maxInactiveInterval: number; // 세션 비활성 시간 (초)
  domain?: string;
  path: string;
}

/**
 * TypeScript WAS와 Spring 간 세션 관리자
 * 쿠키 기반 세션 ID 관리 및 세션 데이터 동기화
 */
export class SessionManager {
  private store: SessionStore;
  private config: SessionManagerConfig;

  constructor(store: SessionStore, config: Partial<SessionManagerConfig> = {}) {
    this.store = store;
    this.config = {
      cookieName: 'TYPESCRIPT_WAS_SESSIONID',
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 60, // 30분
      maxInactiveInterval: 30 * 60, // 30분
      path: '/',
      ...config,
    };
  }

  /**
   * 요청에서 세션 ID 추출
   */
  private extractSessionId(request: Request): string | null {
    const cookieHeader = request.getHeader('cookie');
    if (!cookieHeader) {
      return null;
    }

    const cookies = this.parseCookies(Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader);
    return cookies[this.config.cookieName] || null;
  }

  /**
   * 쿠키 문자열 파싱
   */
  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name && rest.length > 0) {
        cookies[name] = rest.join('=');
      }
    });

    return cookies;
  }

  /**
   * 새 세션 ID 생성
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 세션 가져오기 또는 생성
   */
  async getOrCreateSession(request: Request, response: Response): Promise<SessionData> {
    let sessionId = this.extractSessionId(request);
    let session: SessionData | null = null;

    // 기존 세션 확인
    if (sessionId) {
      session = await this.store.get(sessionId);
    }

    // 세션이 없으면 새로 생성
    if (!session) {
      sessionId = this.generateSessionId();
      session = {
        id: sessionId,
        attributes: {},
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        maxInactiveInterval: this.config.maxInactiveInterval,
      };

      await this.store.set(sessionId, session);

      // 쿠키 설정
      response.cookie(this.config.cookieName, sessionId, {
        maxAge: this.config.maxAge,
        httpOnly: this.config.httpOnly,
        secure: this.config.secure,
        sameSite: this.config.sameSite,
        domain: this.config.domain,
        path: this.config.path,
      });

      console.log(`[SessionManager] Created new session: ${sessionId}`);
    }

    return session;
  }

  /**
   * 세션 업데이트
   */
  async updateSession(sessionData: SessionData): Promise<void> {
    await this.store.set(sessionData.id, sessionData);
  }

  /**
   * 세션 무효화
   */
  async invalidateSession(request: Request, response: Response): Promise<void> {
    const sessionId = this.extractSessionId(request);
    if (sessionId) {
      await this.store.delete(sessionId);
      
      // 쿠키 제거
      response.cookie(this.config.cookieName, '', {
        maxAge: 0,
        httpOnly: this.config.httpOnly,
        secure: this.config.secure,
        sameSite: this.config.sameSite,
        domain: this.config.domain,
        path: this.config.path,
      });

      console.log(`[SessionManager] Invalidated session: ${sessionId}`);
    }
  }

  /**
   * Spring Security 인증 정보를 세션에 동기화
   */
  async syncWithSpringSession(sessionData: SessionData, springSessionData: any): Promise<void> {
    // Spring Security 인증 정보 추출
    if (springSessionData.authentication) {
      const auth = springSessionData.authentication;
      sessionData.userId = auth.principal?.id || auth.name;
      sessionData.username = auth.principal?.username || auth.name;
      sessionData.authorities = auth.authorities?.map((a: any) => a.authority) || [];
    }

    // Spring 세션 속성 동기화
    if (springSessionData.attributes) {
      Object.assign(sessionData.attributes, springSessionData.attributes);
    }

    await this.updateSession(sessionData);
  }

  /**
   * Spring으로 세션 정보 전달용 헤더 생성
   */
  createSpringSessionHeaders(sessionData: SessionData): Record<string, string> {
    const headers: Record<string, string> = {};

    // 세션 ID 헤더
    headers['X-Session-Id'] = sessionData.id;

    // 사용자 인증 정보 헤더
    if (sessionData.userId) {
      headers['X-User-Id'] = sessionData.userId;
    }
    if (sessionData.username) {
      headers['X-Username'] = sessionData.username;
    }
    if (sessionData.authorities && sessionData.authorities.length > 0) {
      headers['X-Authorities'] = sessionData.authorities.join(',');
    }

    // 커스텀 속성 헤더 (JSON으로 직렬화)
    if (Object.keys(sessionData.attributes).length > 0) {
      headers['X-Session-Attributes'] = JSON.stringify(sessionData.attributes);
    }

    return headers;
  }

  /**
   * 세션 정보 로깅
   */
  logSessionInfo(sessionData: SessionData): void {
    console.log(`[SessionManager] Session Info:`, {
      id: sessionData.id,
      userId: sessionData.userId,
      username: sessionData.username,
      authorities: sessionData.authorities,
      attributeKeys: Object.keys(sessionData.attributes),
      createdAt: sessionData.createdAt,
      lastAccessedAt: sessionData.lastAccessedAt,
    });
  }

  /**
   * 세션 관리자 종료
   */
  async destroy(): Promise<void> {
    if (this.store instanceof MemorySessionStore) {
      this.store.destroy();
    }
    console.log('[SessionManager] Session manager destroyed');
  }
} 