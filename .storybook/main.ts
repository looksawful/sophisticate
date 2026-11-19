import type { StorybookConfig } from '@storybook/nextjs-vite';
const config: StorybookConfig = {
 stories: ['../src/**/*.stories.@(ts|tsx|js|jsx)'],
 addons: ['@storybook/addon-docs'],
 framework: { name: '@storybook/nextjs-vite', options: {} },
};
export default config;
