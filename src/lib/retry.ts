export type RetryOptions = Readonly<{
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
}>;

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 4,
  initialDelayMs: 150,
  maxDelayMs: 1_500,
};

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  shouldRetry: (error: unknown) => boolean,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS,
): Promise<T> {
  let attempt = 1;

  while (true) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= options.maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const exponential = Math.min(options.initialDelayMs * 2 ** (attempt - 1), options.maxDelayMs);
      const jitter = Math.floor(Math.random() * Math.max(25, exponential * 0.2));
      await new Promise((resolve) => setTimeout(resolve, exponential + jitter));
      attempt += 1;
    }
  }
}
