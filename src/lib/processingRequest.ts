export interface ProcessingRequestInput {
  duration: number;
  videoWidth: number;
  videoHeight: number;
  sizeLimitEnabled: boolean;
  maxSize: string;
  includeAudio?: boolean;
  trimStart?: number;
  trimEnd?: number;
  speed?: number;
  loop?: number;
}

export interface ValidatedProcessingRequest {
  duration: number;
  videoWidth: number;
  videoHeight: number;
  maxSizeMB?: number;
}

export function validateProcessingRequest(input: ProcessingRequestInput): ValidatedProcessingRequest {
  const { duration, videoWidth, videoHeight } = input;
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(videoWidth) ||
    videoWidth <= 0 ||
    !Number.isFinite(videoHeight) ||
    videoHeight <= 0
  ) {
    throw new Error("Video metadata is invalid or not loaded");
  }

  if (!input.sizeLimitEnabled) {
    return { duration, videoWidth, videoHeight };
  }

  const trimmed = input.maxSize.trim();
  const maxSizeMB = trimmed === "" ? Number.NaN : Number(trimmed);
  if (!Number.isFinite(maxSizeMB) || maxSizeMB <= 0) {
    throw new Error("Max size must be a positive number");
  }

  const trimStart = input.trimStart ?? 0;
  const trimEnd = input.trimEnd ?? duration;
  const speed = input.speed ?? 1;
  const loop = input.loop ?? 1;
  const effectiveDuration = ((trimEnd - trimStart) * loop) / Math.max(0.25, speed);
  if (!Number.isFinite(effectiveDuration) || effectiveDuration <= 0) {
    throw new Error("Video trim or timing settings are invalid");
  }

  const audioBitrateKbps = input.includeAudio === false ? 0 : 128;
  const minimumVideoBitrateKbps = 50;
  const encoderPayloadRatio = 0.92;
  const minimumSizeMB =
    ((minimumVideoBitrateKbps + audioBitrateKbps) * 1000 * effectiveDuration) /
    8 /
    1024 /
    1024 /
    encoderPayloadRatio;

  if (maxSizeMB < minimumSizeMB) {
    throw new Error("Max size is too small for these settings. Increase the limit or disable audio.");
  }

  return { duration, videoWidth, videoHeight, maxSizeMB };
}
