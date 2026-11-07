import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TimelineTrimHandles } from "../components/sophisticate/TimelineTrimHandles";

function TrimExample({ disabled = false }: { disabled?: boolean }) {
  const [trimStart, setTrimStart] = useState(5);
  const [trimEnd, setTrimEnd] = useState(18);
  return (
    <div style={{ width: 520, maxWidth: "90vw", padding: "45px 0", color: "#e5e7eb" }}>
      <p style={{ fontSize: 13, marginBottom: 24 }}>
        Диапазон: {trimStart.toFixed(1)}–{trimEnd.toFixed(1)} с. Управление ручками: стрелки клавиатуры.
      </p>
      <div style={{ position: "relative", height: 24, borderRadius: 8, background: "#27272a" }}>
        <TimelineTrimHandles
          duration={30}
          trimStart={trimStart}
          trimEnd={trimEnd}
          onStartPointerDown={() => {}}
          onEndPointerDown={() => {}}
          onStartChange={setTrimStart}
          onEndChange={setTrimEnd}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
const meta = {
  title: "Editing/Timeline Trim",
  component: TrimExample,
  args: { disabled: false },
  tags: ["autodocs"],
} satisfies Meta<typeof TrimExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Enabled: Story = {};
export const Disabled: Story = { args: { disabled: true } };
