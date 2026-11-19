import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tooltip } from './Tooltip';

const meta = {
  title: 'Controls/Tooltip',
  component: Tooltip,
  args: { text: 'Helpful detail', children: <button type="button">Hover or focus me</button> },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Top: Story = {};
export const Bottom: Story = { args: { position: 'bottom' } };