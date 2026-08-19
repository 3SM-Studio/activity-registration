type LogLevel = "info" | "warn" | "error";

type SafeLogContext = Readonly<
  Partial<{
    requestId: string;
    registrationId: string;
    idempotentReplay: boolean;
    businessDuplicate: boolean;
    code: string;
    status: number;
    durationMs: number;
    warningCount: number;
  }>
>;

const FORBIDDEN_KEY_PATTERN =
  /(name|email|phone|guardian|participant|address|health|pesel|payload|body)/i;

function sanitizeContext(context: SafeLogContext): SafeLogContext {
  return Object.fromEntries(
    Object.entries(context).filter(([key]) => !FORBIDDEN_KEY_PATTERN.test(key)),
  );
}

function log(level: LogLevel, event: string, context: SafeLogContext = {}): void {
  const output = {
    level,
    event,
    ...sanitizeContext(context),
    timestamp: new Date().toISOString(),
  };

  const serialized = JSON.stringify(output);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export const logger = {
  info: (event: string, context?: SafeLogContext) => log("info", event, context),
  warn: (event: string, context?: SafeLogContext) => log("warn", event, context),
  error: (event: string, context?: SafeLogContext) => log("error", event, context),
};
