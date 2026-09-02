import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { searchProcurement, type ProcurementSearchHit } from '../services/bharatbid';
import { focusRing } from '../ui/styles';

export function TopbarSearch() {
  const { accessToken, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ProcurementSearchHit[]>([]);
  const [open, setOpen] = useState(false);

  if (!isAuthenticated || !accessToken) {
    return null;
  }

  const token = accessToken;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    void searchProcurement(token, value)
      .then((result) => {
        setHits(result.items);
        setOpen(true);
      })
      .catch(() => {
        setHits([]);
        setOpen(false);
      });
  }

  return (
    <div className="relative hidden min-w-[18rem] max-w-sm flex-1 xl:block">
      <form role="search" className="flex items-center gap-1.5" onSubmit={onSubmit}>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value.trim().length < 2) {
              setHits([]);
              setOpen(false);
            }
          }}
          placeholder="Search tenders, bidders, verification IDs…"
          aria-label="Search tenders, bidders, or verification IDs"
          autoComplete="off"
          className={`h-8 w-full rounded-md border border-edge bg-surface-elevated px-2.5 text-xs text-foreground placeholder:text-foreground-muted ${focusRing}`}
        />
        <button
          type="submit"
          className={`h-8 shrink-0 rounded-md border border-edge bg-surface-muted px-2.5 text-xs font-medium text-foreground hover:bg-edge ${focusRing}`}
        >
          Search
        </button>
      </form>
      {open && hits.length > 0 ? (
        <ul className="absolute z-20 mt-1 w-full divide-y divide-edge rounded-md border border-edge bg-surface-elevated">
          {hits.map((hit) => (
            <li key={`${hit.type}-${hit.id}`}>
              <Link
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-surface-muted"
                to={hit.href}
                onClick={() => {
                  setOpen(false);
                  setHits([]);
                }}
              >
                <span>
                  <span className="font-medium">{hit.label}</span>
                  <span className="ml-2 text-foreground-muted">{hit.sublabel}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wide text-foreground-muted">{hit.type}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
