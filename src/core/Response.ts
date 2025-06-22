import { ServerResponse } from 'http';

/**
 * HTTP 응답을 추상화한 클래스
 * Node.js의 ServerResponse를 래핑하여 편리한 API 제공
 */
export class Response {
  private readonly _raw: ServerResponse;
  private _statusCode = 200;
  private _headers: Record<string, string | string[]> = {};
  private _headersSent = false;

  constructor(res: ServerResponse) {
    this._raw = res;
  }

  /**
   * 원본 Node.js ServerResponse 객체에 접근
   */
  public get raw(): ServerResponse {
    return this._raw;
  }

  /**
   * HTTP 상태 코드 설정
   * @param code HTTP 상태 코드 (예: 200, 404, 500)
   */
  public status(code: number): Response {
    this._statusCode = code;
    return this;
  }

  /**
   * 현재 설정된 상태 코드 조회
   */
  public getStatus(): number {
    return this._statusCode;
  }

  /**
   * 응답 헤더 설정
   * @param name 헤더 이름
   * @param value 헤더 값
   */
  public setHeader(name: string, value: string | string[]): Response {
    this._headers[name.toLowerCase()] = value;
    return this;
  }

  /**
   * 여러 헤더를 한번에 설정
   * @param headers 헤더 객체
   */
  public setHeaders(headers: Record<string, string | string[]>): Response {
    for (const [name, value] of Object.entries(headers)) {
      this.setHeader(name, value);
    }
    return this;
  }

  /**
   * 특정 헤더 값 조회
   * @param name 헤더 이름
   */
  public getHeader(name: string): string | string[] | undefined {
    return this._headers[name.toLowerCase()];
  }

  /**
   * 모든 헤더 조회
   */
  public getHeaders(): Record<string, string | string[]> {
    return { ...this._headers };
  }

  /**
   * 헤더 제거
   * @param name 제거할 헤더 이름
   */
  public removeHeader(name: string): Response {
    delete this._headers[name.toLowerCase()];
    return this;
  }

  /**
   * Content-Type 헤더 설정
   * @param type MIME 타입 (예: 'text/html', 'application/json')
   */
  public contentType(type: string): Response {
    return this.setHeader('Content-Type', type);
  }

  /**
   * 쿠키 설정
   * @param name 쿠키 이름
   * @param value 쿠키 값
   * @param options 쿠키 옵션 (예: maxAge, httpOnly, secure 등)
   */
  public cookie(
    name: string,
    value: string,
    options: {
      maxAge?: number;
      expires?: Date;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      domain?: string;
      path?: string;
    } = {}
  ): Response {
    let cookieString = `${name}=${value}`;

    if (options.maxAge !== undefined) {
      cookieString += `; Max-Age=${options.maxAge}`;
    }

    if (options.expires) {
      cookieString += `; Expires=${options.expires.toUTCString()}`;
    }

    if (options.httpOnly) {
      cookieString += '; HttpOnly';
    }

    if (options.secure) {
      cookieString += '; Secure';
    }

    if (options.sameSite) {
      cookieString += `; SameSite=${options.sameSite}`;
    }

    if (options.domain) {
      cookieString += `; Domain=${options.domain}`;
    }

    if (options.path) {
      cookieString += `; Path=${options.path}`;
    }

    // 기존 Set-Cookie 헤더가 있으면 배열로 처리
    const existingCookies = this.getHeader('Set-Cookie');
    if (existingCookies) {
      const cookiesArray = Array.isArray(existingCookies) 
        ? existingCookies 
        : [existingCookies];
      cookiesArray.push(cookieString);
      this.setHeader('Set-Cookie', cookiesArray);
    } else {
      this.setHeader('Set-Cookie', cookieString);
    }

    return this;
  }

  /**
   * 리다이렉트 응답 전송
   * @param url 리다이렉트할 URL
   * @param statusCode 리다이렉트 상태 코드 (기본값: 302)
   */
  public redirect(url: string, statusCode = 302): void {
    this.status(statusCode)
      .setHeader('Location', url)
      .end();
  }

  /**
   * JSON 응답 전송
   * @param data JSON으로 직렬화할 데이터
   */
  public json(data: any): void {
    this.contentType('application/json; charset=utf-8')
      .send(JSON.stringify(data));
  }

  /**
   * 텍스트 응답 전송
   * @param text 전송할 텍스트
   */
  public text(text: string): void {
    this.contentType('text/plain; charset=utf-8')
      .send(text);
  }

  /**
   * HTML 응답 전송
   * @param html 전송할 HTML
   */
  public html(html: string): void {
    this.contentType('text/html; charset=utf-8')
      .send(html);
  }

  /**
   * 응답 본문과 함께 응답 전송
   * @param body 응답 본문
   */
  public send(body: string | Buffer): void {
    this.writeHeadersIfNeeded();
    this._raw.end(body);
  }

  /**
   * 응답 본문 없이 응답 종료
   */
  public end(): void {
    this.writeHeadersIfNeeded();
    this._raw.end();
  }

  /**
   * 헤더가 이미 전송되었는지 확인
   */
  public get headersSent(): boolean {
    return this._headersSent || this._raw.headersSent;
  }

  /**
   * 응답이 완료되었는지 확인
   */
  public get finished(): boolean {
    return this._raw.finished;
  }

  /**
   * 필요한 경우 헤더를 실제 응답에 적용
   */
  private writeHeadersIfNeeded(): void {
    if (this._headersSent || this._raw.headersSent) {
      return;
    }

    // 상태 코드 설정
    this._raw.statusCode = this._statusCode;

    // 헤더 설정
    for (const [name, value] of Object.entries(this._headers)) {
      this._raw.setHeader(name, value);
    }

    this._headersSent = true;
  }
} 