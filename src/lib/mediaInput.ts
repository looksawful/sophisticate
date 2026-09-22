export type VideoFileDescriptor = Pick<File, "name" | "type">;

const SUPPORTED_VIDEO_EXTENSIONS = [".mp4", ".m4v", ".mov", ".webm"] as const;

export function isSupportedVideoFile(file: VideoFileDescriptor): boolean {
  const mime = file.type.trim().toLowerCase();
  if (mime) return mime.startsWith("video/");

  const name = file.name.trim().toLowerCase();
  return SUPPORTED_VIDEO_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function getUnsupportedVideoMessage(): string {
  return "Unsupported video. Choose an MP4, M4V, MOV, or WEBM file.";
}
