import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { getApiErrorMessage } from '../../services/api';
import {
  listProcurementActivity,
  listTenders,
  type ProcurementActivityItem,
  type TenderListItem,
} from '../../services/bharatbid';
import {
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  Pagination,
  Select,
} from '../../ui';

export function ActivityPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ProcurementActivityItem[]>([]);
  const [tenders, setTenders] = useState<TenderListItem[]>([]);
  const [tenderId, setTenderId] = useState('');
  const [actor, setActor] = useState('');
  const [eventType, setEventType] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function load(token: string, nextPage = page) {
    setLoading(true);
    setError(undefined);
    try {
      const [result, tenderList] = await Promise.all([
        listProcurementActivity(token, {
          page: nextPage,
          pageSize: 20,
          tenderId: tenderId || undefined,
          actor: actor || undefined,
          eventType: eventType || undefined,
        }),
        listTenders(token, { page: 1, pageSize: 50 }),
      ]);
      setItems(result.items);
      setTotal(result.meta.totalItems);
      setPage(result.meta.page);
      setTenders(tenderList.items);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load procurement activity.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    void load(accessToken, 1);
  }, [accessToken, tenderId, actor, eventType]);

  const grouped = items.reduce<Record<string, ProcurementActivityItem[]>>((acc, item) => {
    const day = item.timestamp.slice(0, 10);
    acc[day] = acc[day] ?? [];
    acc[day].push(item);
    return acc;
  }, {});

  return (
    <PageContainer
      width="wide"
      breadcrumb={
        <Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Activity' }]} />
      }
      title="Procurement activity"
      description="End-to-end timeline of officer and system events. DEMO / SYNTHETIC records are labelled."
      actions={
        <Button variant="outline" disabled={loading || !accessToken} onClick={() => accessToken && void load(accessToken)}>
          Refresh
        </Button>
      }
    >
      <SessionGate>
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <Select
            label="Tender"
            value={tenderId}
            onChange={(event) => setTenderId(event.target.value)}
            options={[{ value: '', label: 'All tenders' }, ...tenders.map((item) => ({ value: item.id, label: item.referenceNumber }))]}
          />
          <Select
            label="Actor"
            value={actor}
            onChange={(event) => setActor(event.target.value)}
            options={[
              { value: '', label: 'Officer and system' },
              { value: 'officer', label: 'Officer' },
              { value: 'system', label: 'System' },
            ]}
          />
          <Select
            label="Event type"
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            options={[
              { value: '', label: 'All events' },
              { value: 'bid', label: 'Bids' },
              { value: 'verification', label: 'Verification' },
              { value: 'review', label: 'Review' },
              { value: 'clarification', label: 'Clarification' },
              { value: 'evaluation', label: 'Evaluation' },
              { value: 'document', label: 'Documents' },
              { value: 'tender', label: 'Tenders' },
            ]}
          />
        </div>
        {error ? <ErrorState title="Unable to load activity" message={error} onRetry={() => accessToken && void load(accessToken)} /> : null}
        {loading && items.length === 0 ? <LoadingState label="Loading activity timeline" /> : null}
        {!loading && items.length === 0 && !error ? <EmptyState title="No activity yet" description="Procurement actions will appear here as officers and the system record events." /> : null}
        {Object.entries(grouped).map(([day, events]) => (
          <Card key={day} className="mb-4">
            <h2 className="text-sm font-semibold">{formatDay(day)}</h2>
            <ol className="mt-3 space-y-3">
              {events.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 border-b border-edge pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-foreground-muted">
                      {item.timestamp.slice(11, 16)} ·{' '}
                      <span className="font-semibold text-foreground">
                        {item.actorKind === 'officer' ? 'OFFICER' : 'SYSTEM'}
                      </span>
                      {' · '}
                      {item.actorLabel}
                    </p>
                    <p className="mt-1 text-sm font-medium">{item.title}</p>
                    {item.href ? (
                      <button type="button" className="mt-1 text-xs underline" onClick={() => navigate(item.href!)}>
                        Open related record
                      </button>
                    ) : null}
                  </div>
                  <span className="text-xs text-foreground-muted">{item.demoLabel}</span>
                </li>
              ))}
            </ol>
          </Card>
        ))}
        <Pagination page={page} pageSize={20} total={total} onPageChange={(next) => accessToken && void load(accessToken, next)} />
        <p className="mt-4 text-sm">
          <Link className="underline" to="/bharatbid">
            Return to command center
          </Link>
        </p>
      </SessionGate>
    </PageContainer>
  );
}

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
