import type { Preview } from '@storybook/nextjs-vite';
import '../src/app/globals.css';
const preview: Preview = { parameters: { layout: 'centered', controls: { expanded: true } } };
export default preview;
