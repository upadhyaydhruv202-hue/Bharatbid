import { useId } from 'react';

export function ProcurementDepthVisual({ className = '' }: { className?: string }) {
  const titleId = useId();
  return (
    <div className={`bb-depth-scene ${className}`.trim()} aria-hidden={false}>
      <div className="bb-depth-scene__stage">
        <div className="bb-depth-card bb-depth-card--1">
          <p className="bb-depth-card__kicker">Documents</p>
          <p className="bb-depth-card__title">Tender evidence</p>
        </div>
        <div className="bb-depth-card bb-depth-card--2">
          <p className="bb-depth-card__kicker">Evidence</p>
          <p className="bb-depth-card__title">Identifier records</p>
        </div>
        <div className="bb-depth-card bb-depth-card--3">
          <p className="bb-depth-card__kicker">Verification</p>
          <p className="bb-depth-card__title">Source comparison</p>
        </div>
        <div className="bb-depth-card bb-depth-card--4">
          <p className="bb-depth-card__kicker">Compliance</p>
          <p className="bb-depth-card__title">Officer review</p>
        </div>
      </div>
      <p id={titleId} className="sr-only">
        Layered procurement workflow: documents, evidence, verification, and compliance.
      </p>
    </div>
  );
}
