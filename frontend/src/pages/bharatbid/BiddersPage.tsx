import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { formatDate, PresenceLabel } from '../../components/bharatbid/StatusBadge';
import { hasPermission } from '../../lib/rbac';
import { getApiErrorMessage } from '../../services/api';
import { listBidders, type BidderListItem } from '../../services/bharatbid';
import { Breadcrumb, Button, DataTable, ErrorState, Input, PageContainer, Pagination, Search, Select } from '../../ui';

function locationOf(row: BidderListItem): string {
  if (row.city && row.state) {
    return `${row.city}, ${row.state}`;
  }
  return row.city || row.state || '—';
}

export function BiddersPage() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<BidderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [completeness, setCompleteness] = useState('');
  const [hasUdyam, setHasUdyam] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const canWrite = hasPermission(user, 'bidders.write');

  async function load(token: string, nextPage = page) {
    setLoading(true);
    setError(undefined);
    try {
      const result = await listBidders(token, {
        page: nextPage,
        pageSize,
        q: search,
        state: stateFilter || undefined,
        city: cityFilter || undefined,
        completeness: completeness || undefined,
        hasUdyam: hasUdyam === '' ? undefined : hasUdyam === 'true',
      });
      setItems(result.items);
      setTotal(result.meta.totalItems);
      setPage(result.meta.page);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load bidders. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken) {
      void load(accessToken, 1);
    }
  }, [accessToken, pageSize, completeness, hasUdyam]);

  return (
    <PageContainer
      width="wide"
      breadcrumb={<Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Bidders' }]} />}
      title="Bidders"
      description="Identifier presence (provided / not provided) is not a government verification result. Bid-level DEMO SOURCE checks live on each submission."
      actions={canWrite ? <Button onClick={() => navigate('/bharatbid/bidders/new')}>Register bidder</Button> : null}
    >
      <SessionGate title="Sign in to view bidders">
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_8rem_8rem_11rem_11rem] lg:items-end">
          <Search
            value={search}
            onChange={setSearch}
            onSubmitSearch={() => accessToken && void load(accessToken, 1)}
            placeholder="Search name or email"
            loading={loading}
          />
          <Input
            label="State"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
            placeholder="e.g. Tamil Nadu"
          />
          <Input
            label="City"
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
            placeholder="e.g. Chennai"
          />
          <Select
            label="Profile completeness"
            value={completeness}
            onChange={(event) => setCompleteness(event.target.value)}
          >
            <option value="">All profiles</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </Select>
          <Select label="Udyam" value={hasUdyam} onChange={(event) => setHasUdyam(event.target.value)}>
            <option value="">All</option>
            <option value="true">Udyam provided</option>
            <option value="false">Udyam not provided</option>
          </Select>
          {search || stateFilter || cityFilter || completeness || hasUdyam ? (
            <Button
              variant="ghost"
              className="lg:col-span-5 justify-self-start"
              onClick={() => {
                setSearch('');
                setStateFilter('');
                setCityFilter('');
                setCompleteness('');
                setHasUdyam('');
                if (accessToken) void load(accessToken, 1);
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
        {error ? (
          <ErrorState message={error} onRetry={() => accessToken && void load(accessToken)} />
        ) : (
          <>
            <DataTable
              columns={[
                { id: 'legalName', header: 'Bidder', accessor: 'legalName', className: 'min-w-[12rem]' },
                { id: 'tradeName', header: 'Business name', accessor: (row) => row.tradeName ?? '—' },
                { id: 'location', header: 'Location', accessor: locationOf },
                {
                  id: 'gstinStatus',
                  header: 'GSTIN status',
                  accessor: (row) => <PresenceLabel value={row.gstinStatus} />,
                },
                {
                  id: 'panStatus',
                  header: 'PAN status',
                  accessor: (row) => <PresenceLabel value={row.panStatus} />,
                },
                {
                  id: 'udyamStatus',
                  header: 'Udyam status',
                  accessor: (row) => <PresenceLabel value={row.udyamStatus} />,
                },
                { id: 'tenderCount', header: 'Tenders', accessor: 'tenderCount' },
                { id: 'activeBidCount', header: 'Active bids', accessor: 'activeBidCount' },
                {
                  id: 'lastParticipationAt',
                  header: 'Last participation',
                  accessor: (row) => formatDate(row.lastParticipationAt),
                },
                {
                  id: 'actions',
                  header: 'Actions',
                  accessor: (row) => (
                    <Link className="text-sm underline" to={`/bharatbid/bidders/${row.id}`}>
                      View →
                    </Link>
                  ),
                },
              ]}
              rows={items}
              rowId={(row) => row.id}
              loading={loading}
              emptyTitle="No bidder profiles found."
              onRowClick={(row) => navigate(`/bharatbid/bidders/${row.id}`)}
            />
            <Pagination
              className="mt-4"
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={(next) => accessToken && void load(accessToken, next)}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </SessionGate>
    </PageContainer>
  );
}
