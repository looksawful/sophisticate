export interface ProcessingRequestInput {
  duration: number;
  videoWidth: number;
  videoHeight: number;
  sizeLimitEnabled: boolean;
  maxSize: string;
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

  return { duration, videoWidth, videoHeight, maxSizeMB };
}
