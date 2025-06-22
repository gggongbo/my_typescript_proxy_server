import { Server } from './core/Server'; // 상대 경로 사용

/**
 * 애플리케이션의 메인 진입점 파일
 */

// === 로직 구현 순서 ===
// 1. 서버 인스턴스를 생성합니다.
//    - 필요하다면 포트 번호를 인자로 전달할 수 있습니다. (예: const server = new Server(3000);)
//    - 기본 포트(8080)를 사용하려면 인자 없이 생성합니다. (const server = new Server();)
const server = new Server();

// 2. 생성된 서버 인스턴스의 start() 메소드를 호출하여 서버를 시작합니다.
console.log('hello server');
server.start();

// 3. 우아한 종료(Graceful Shutdown) 처리 로직
const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  try {
    await server.stop(); // 서버 중지 완료를 기다림
    console.log('Server successfully shut down.');
    process.exit(0); // 정상 종료
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1); // 오류 종료
  }
};

// SIGINT (Ctrl+C) 및 SIGTERM 시그널에 리스너 등록
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// [선택 사항] 예상치 못한 오류 처리 (Uncaught Exception)
// process.on('uncaughtException', (error) => {
//   console.error('Uncaught Exception:', error);
//   // 여기서도 gracefulShutdown을 시도하거나, 즉시 종료할 수 있음
//   process.exit(1);
// });

// [선택 사항] 처리되지 않은 Promise 거부 처리 (Unhandled Rejection)
// process.on('unhandledRejection', (reason, promise) => {
//   console.error('Unhandled Rejection at:', promise, 'reason:', reason);
//   // 여기서도 gracefulShutdown을 시도하거나, 즉시 종료할 수 있음
//   process.exit(1);
// });
