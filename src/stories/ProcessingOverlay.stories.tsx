import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProcessingOverlay } from "../components/sophisticate/ProcessingOverlay";
const meta = {
  title: "Processing/Progress",
  component: ProcessingOverlay,
  args: { progress: 0.42, prefersReducedMotion: true },
  tags: ["autodocs"],
  decorators: [(Story) => <div style={{ width: 440, maxWidth: "90vw" }}><Story /></div>],
} satisfies Meta<typeof ProcessingOverlay>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Processing: Story = {};
export const Preparing: Story = { args: { progress: 0.04 } };
export const Finalizing: Story = { args: { progress: 0.97 } };
export const Complete: Story = { args: { progress: 1 } };
