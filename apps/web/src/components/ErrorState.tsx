export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-state">
      <strong>Something went wrong</strong>
      <p className="muted">{message}</p>
      {onRetry ? (
        <button className="secondary-button" type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
