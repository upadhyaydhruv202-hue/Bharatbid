export function IntelligenceBackground({ className = '' }: { className?: string }) {
  return <div className={`pointer-events-none absolute inset-0 bb-intel-bg ${className}`} aria-hidden />;
}
