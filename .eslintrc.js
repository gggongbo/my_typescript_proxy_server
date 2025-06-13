module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'prettier', // eslint-plugin-prettier 추가
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended', // eslint-config-prettier + eslint-plugin-prettier 통합 설정
  ],
  parserOptions: {
    ecmaVersion: 'latest', // ES2022를 사용하므로 latest로 설정
    sourceType: 'module',
  },
  env: {
    es2021: true, // ES2022 기능 일부 포함 (또는 es2022 직접 명시 가능시)
    node: true,
  },
  rules: {
    // 필요한 경우 여기에 추가적인 규칙을 정의할 수 있습니다.
    // 예: "@typescript-eslint/no-unused-vars": "warn" // 사용하지 않는 변수 경고
    'prettier/prettier': 'warn', // Prettier 규칙 위반 시 경고 표시 (error로 변경 가능)
  },
};
