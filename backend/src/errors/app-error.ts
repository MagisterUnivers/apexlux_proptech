export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

// Custom Errors
export const Errors = {
  INVALID_URL: () => new AppError(400, "INVALID_URL", "Invalid or unsafe URL"),
  INVALID_FORMAT: () =>
    new AppError(400, "INVALID_FORMAT", "Format must be jpeg, png or webp"),
  RESIZE_FAILED: () =>
    new AppError(422, "RESIZE_FAILED", "Image could not be resized"),
  FETCH_FAILED: () =>
    new AppError(502, "FETCH_FAILED", "Could not fetch image from URL"),
};
