"use client";

import { SophisticatePreviewView } from "@/components/sophisticate/SophisticatePreviewView";
import { useSophisticateController } from "@/components/sophisticate/useSophisticateController";

export default function SophisticatePreview() {
  const controller = useSophisticateController();
  return <SophisticatePreviewView c={controller} />;
}
