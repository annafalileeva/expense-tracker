import tseslint from 'typescript-eslint';
import base from './base.mjs';

/**
 * Конфиг для приложений на Nest.js.
 * Послабления связаны со спецификой фреймворка: пустые классы-модули,
 * декораторы и типы, которые Prisma отдаёт как `any`.
 */
export default tseslint.config(...base, {
  files: ['**/*.ts'],
  rules: {
    '@typescript-eslint/no-extraneous-class': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
});
