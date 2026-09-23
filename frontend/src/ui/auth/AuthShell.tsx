import type { ReactNode } from 'react';

import { ProcurementDepthVisual } from './ProcurementDepthVisual';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="bb-auth-shell">
      <div className="bb-auth-shell__grid">
        <aside className="bb-auth-shell__brand bb-stagger" aria-label="About BharatBid">
          <div className="bb-auth-mark">
            <span className="bb-auth-mark__badge" aria-hidden="true">
              BB
            </span>
            <div>
              <p className="bb-auth-mark__name">BharatBid AI</p>
              <p className="bb-auth-mark__tag">Procurement intelligence workspace</p>
            </div>
          </div>

          <h1 className="bb-auth-shell__headline">
            Evidence-led bid evaluation for serious procurement teams
          </h1>
          <p className="bb-auth-shell__lede">
            Bring tender documents, verification status, officer review, and comparative evaluation into one controlled
            workspace — with clear DEMO versus live source labelling.
          </p>

          <ul className="bb-auth-points">
            <li>
              <span className="bb-auth-points__label">Identity</span>
              <span className="bb-auth-points__text">Email OTP or Google sign-in verifies who you are</span>
            </li>
            <li>
              <span className="bb-auth-points__label">Access</span>
              <span className="bb-auth-points__text">Organization membership and role decide what you can see</span>
            </li>
            <li>
              <span className="bb-auth-points__label">Integrity</span>
              <span className="bb-auth-points__text">Not a Government of India service; does not award or reject bids</span>
            </li>
          </ul>

          <ProcurementDepthVisual className="mt-8" />
        </aside>

        <div className="bb-auth-shell__panel bb-page-enter">{children}</div>
      </div>
    </div>
  );
}
