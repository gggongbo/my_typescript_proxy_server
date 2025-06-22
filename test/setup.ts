/**
 * Jest 테스트 전역 설정
 */

// 테스트 타임아웃 설정
jest.setTimeout(10000);

// 전역 변수 설정 (필요한 경우)
(global as any).testPort = 0; // 랜덤 포트 사용 