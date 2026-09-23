import { useId } from 'react';

const STAGES = [
  { kicker: '01', title: 'Tender evidence', detail: 'Requirements and submissions' },
  { kicker: '02', title: 'Verification', detail: 'Source-backed checks' },
  { kicker: '03', title: 'Officer review', detail: 'Clarifications and decisions' },
  { kicker: '04', title: 'Evaluation', detail: 'Comparative ranking' },
] as const;

export function ProcurementDepthVisual({ className = '' }: { className?: string }) {
  const titleId = useId();
  return (
    <div className={`bb-depth-scene ${className}`.trim()} aria-labelledby={titleId}>
      <p id={titleId} className="sr-only">
        Procurement workflow stages: tender evidence, verification, officer review, and evaluation.
      </p>
      <div className="bb-depth-scene__stage" aria-hidden="true">
        {STAGES.map((stage, index) => (
          <div key={stage.kicker} className={`bb-depth-card bb-depth-card--${index + 1}`}>
            <p className="bb-depth-card__kicker">{stage.kicker}</p>
            <p className="bb-depth-card__title">{stage.title}</p>
            <p className="bb-depth-card__detail">{stage.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
