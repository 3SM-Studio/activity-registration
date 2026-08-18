export function FieldError({
  id,
  message,
}: {
  readonly id: string;
  readonly message: string | undefined;
}) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-red-700">
      {message}
    </p>
  );
}
