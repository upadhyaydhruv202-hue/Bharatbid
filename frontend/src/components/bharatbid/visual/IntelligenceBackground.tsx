export function IntelligenceBackground({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden bb-intel-bg ${className}`}
      aria-hidden
    >
      <span className="bb-float absolute left-[12%] top-[18%] h-1.5 w-1.5 rounded-full bg-info/30" />
      <span className="bb-float absolute right-[16%] top-[28%] h-1 w-1 rounded-full bg-info/25" style={{ animationDelay: '1.4s' }} />
      <span className="bb-float absolute left-[22%] bottom-[22%] h-1 w-1 rounded-full bg-info/20" style={{ animationDelay: '2.2s' }} />
      <span className="bb-float absolute right-[28%] bottom-[16%] h-1.5 w-1.5 rounded-full bg-info/25" style={{ animationDelay: '0.8s' }} />
    </div>
  );
}
