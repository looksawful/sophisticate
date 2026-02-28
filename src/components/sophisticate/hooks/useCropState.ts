"use client";

import type { Crop } from "@/lib/videoUtils";
import { normalizeCrop } from "@/lib/videoUtils";
import { useCallback, useMemo, useState } from "react";
import type { Area } from "react-easy-crop";

import { ASPECT_PRESETS, type AspectPreset } from "../config";

export function useCropState() {
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, w: 1, h: 1 });
  const [activePreset, setActivePreset] = useState<string>("Original");
  const [customW, setCustomW] = useState("16");
  const [customH, setCustomH] = useState("9");
  const [cropEnabled, setCropEnabled] = useState(true);
  const [uiCrop, setUiCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoomRaw] = useState(1);
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });
  const [showCirclePreview, setShowCirclePreview] = useState(false);

  const cropAspect = useMemo(() => {
    if (activePreset === "Original") return undefined;
    if (activePreset === "Free") {
      const w = parseFloat(customW);
      const h = parseFloat(customH);
      if (w > 0 && h > 0) return w / h;
      return undefined;
    }
    const preset = ASPECT_PRESETS.find((p) => p.label === activePreset);
    if (!preset || preset.w <= 0 || preset.h <= 0) return undefined;
    return preset.w / preset.h;
  }, [activePreset, customW, customH]);

  const zoomStep = useMemo(() => {
    const minSide = Math.min(videoDims.w, videoDims.h);
    if (minSide >= 2160) return 0.005;
    if (minSide >= 1080) return 0.01;
    if (minSide >= 720) return 0.015;
    return 0.02;
  }, [videoDims.h, videoDims.w]);

  const setZoom = useCallback(
    (nextZoom: number) => {
      const clamped = Math.max(1, Math.min(3, nextZoom));
      const snapped = Math.round(clamped / zoomStep) * zoomStep;
      setZoomRaw(Number(snapped.toFixed(4)));
    },
    [zoomStep],
  );

  const applyPresetCrop = useCallback((preset: AspectPreset, width: number, height: number): Crop => {
    if (preset.w === 0 || preset.h === 0 || width <= 0 || height <= 0) {
      return { x: 0, y: 0, w: 1, h: 1 };
    }
    const targetAspect = preset.w / preset.h;
    const videoAspect = width / height;
    let newW: number;
    let newH: number;

    if (targetAspect > videoAspect) {
      newW = 1;
      newH = width / targetAspect / height;
    } else {
      newH = 1;
      newW = (height * targetAspect) / width;
    }

    newW = Math.min(1, newW);
    newH = Math.min(1, newH);
    return normalizeCrop({ x: (1 - newW) / 2, y: (1 - newH) / 2, w: newW, h: newH });
  }, []);

  const applyPreset = useCallback(
    (preset: AspectPreset) => {
      setActivePreset(preset.label);
      setUiCrop({ x: 0, y: 0 });
      setZoomRaw(1);
      if (preset.label === "Original") {
        setCrop({ x: 0, y: 0, w: 1, h: 1 });
        return;
      }
      if (preset.label === "Free") {
        const w = parseFloat(customW);
        const h = parseFloat(customH);
        if (w > 0 && h > 0 && videoDims.w > 0 && videoDims.h > 0) {
          setCrop(applyPresetCrop({ label: "Free", w, h, desc: "" }, videoDims.w, videoDims.h));
        } else {
          setCrop({ x: 0, y: 0, w: 1, h: 1 });
        }
        return;
      }
      if (videoDims.w <= 0 || videoDims.h <= 0) {
        setCrop({ x: 0, y: 0, w: 1, h: 1 });
        return;
      }
      setCrop(applyPresetCrop(preset, videoDims.w, videoDims.h));
    },
    [applyPresetCrop, customH, customW, videoDims.h, videoDims.w],
  );

  const applyCustomRatio = useCallback(
    (w: string, h: string) => {
      setCustomW(w);
      setCustomH(h);
      setActivePreset("Free");
      setUiCrop({ x: 0, y: 0 });
      setZoomRaw(1);
      const nw = parseFloat(w);
      const nh = parseFloat(h);
      if (nw > 0 && nh > 0 && videoDims.w > 0 && videoDims.h > 0) {
        setCrop(applyPresetCrop({ label: "Custom", w: nw, h: nh, desc: "" }, videoDims.w, videoDims.h));
      }
    },
    [applyPresetCrop, videoDims.w, videoDims.h],
  );

  const onCropComplete = useCallback(
    (_: Area, croppedAreaPixels: Area) => {
      if (videoDims.w <= 0 || videoDims.h <= 0) return;
      const next = normalizeCrop({
        x: croppedAreaPixels.x / videoDims.w,
        y: croppedAreaPixels.y / videoDims.h,
        w: croppedAreaPixels.width / videoDims.w,
        h: croppedAreaPixels.height / videoDims.h,
      });
      setCrop(next);
    },
    [videoDims.h, videoDims.w],
  );

  const resetCrop = useCallback(() => {
    setCrop({ x: 0, y: 0, w: 1, h: 1 });
    setUiCrop({ x: 0, y: 0 });
    setZoomRaw(1);
    setVideoDims({ w: 0, h: 0 });
    setShowCirclePreview(false);
  }, []);

  return {
    crop,
    setCrop,
    activePreset,
    setActivePreset,
    customW,
    setCustomW,
    customH,
    setCustomH,
    cropEnabled,
    setCropEnabled,
    uiCrop,
    setUiCrop,
    zoom,
    setZoom,
    zoomStep,
    cropAspect,
    videoDims,
    setVideoDims,
    showCirclePreview,
    setShowCirclePreview,
    applyPresetCrop,
    applyPreset,
    applyCustomRatio,
    onCropComplete,
    resetCrop,
  };
}
