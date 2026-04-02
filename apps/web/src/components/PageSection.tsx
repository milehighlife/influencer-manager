import type { PropsWithChildren, ReactNode } from "react";

export function PageSection({
  eyebrow,
  title,
  actions,
  children,
}: PropsWithChildren<{
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
}>) {
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
