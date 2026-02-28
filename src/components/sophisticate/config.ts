import { cubicBezier } from "framer-motion";

export const repoUrl = "https://github.com/looksawful/sophisticate";
export const licenseUrl = `${repoUrl}/blob/main/LICENSE`;

export type AspectPreset = { label: string; w: number; h: number; desc: string };

export const SPECIAL_PRESETS: AspectPreset[] = [
  { label: "Original", w: 0, h: 0, desc: "Keep original aspect ratio" },
  { label: "Free", w: -1, h: -1, desc: "Enter custom ratio" },
];

export const RATIO_PRESETS: AspectPreset[] = [
  { label: "1:1", w: 1, h: 1, desc: "Square — Instagram post, profile" },
  { label: "4:3", w: 4, h: 3, desc: "Classic — presentations" },
  { label: "3:4", w: 3, h: 4, desc: "Portrait — classic vertical" },
  { label: "4:5", w: 4, h: 5, desc: "Portrait — Instagram feed" },
  { label: "5:4", w: 5, h: 4, desc: "Landscape — social photo" },
  { label: "16:9", w: 16, h: 9, desc: "Landscape — YouTube, web" },
  { label: "9:16", w: 9, h: 16, desc: "Vertical — Stories, Reels, TikTok, Shorts" },
  { label: "21:9", w: 21, h: 9, desc: "Ultrawide — cinematic" },
  { label: "9:21", w: 9, h: 21, desc: "Ultra-tall — vertical cinematic" },
];

export const ASPECT_PRESETS: AspectPreset[] = [...SPECIAL_PRESETS, ...RATIO_PRESETS];

const easeStandard = cubicBezier(0.22, 1, 0.36, 1);

export const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export const hoverLift = { whileHover: { y: -1 }, whileTap: { scale: 0.98 } };

export const riseVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeStandard } },
};

export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.6, ease: easeStandard } },
};
