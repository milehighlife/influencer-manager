export function LoadingPage({ label }: { label: string }) {
  return (
    <div className="screen-center">
      <div className="panel">
        <p className="eyebrow">Workspace</p>
        <h1>Loading</h1>
        <p className="muted">{label}</p>
      </div>
    </div>
  );
}
