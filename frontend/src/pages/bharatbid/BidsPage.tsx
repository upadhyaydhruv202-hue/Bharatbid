import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { BID_STATUS_OPTIONS, formatDate, StatusBadge } from '../../components/bharatbid/StatusBadge';
import { hasPermission } from '../../lib/rbac';
import { getApiErrorMessage } from '../../services/api';
import { listBidders, listBids, listTenders, type BidListItem, type BidderListItem, type TenderListItem } from '../../services/bharatbid';
import { Breadcrumb, Button, DataTable, ErrorState, PageContainer, Pagination, Search, Select } from '../../ui';

export function BidsPage() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tenderFromUrl = params.get('tenderId') ?? '';
  const bidderFromUrl = params.get('bidderId') ?? '';
  const [items, setItems] = useState<BidListItem[]>([]);
  const [tenders, setTenders] = useState<TenderListItem[]>([]);
  const [bidders, setBidders] = useState<BidderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tenderId, setTenderId] = useState(tenderFromUrl);
  const [bidderId, setBidderId] = useState(bidderFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const canWrite = hasPermission(user, 'bids.write');

  async function load(token: string, nextPage = page) {
    setLoading(true);
    setError(undefined);
    try {
      const result = await listBids(token, {
        page: nextPage,
        pageSize,
        q: search,
        status: status || undefined,
        tenderId: tenderId || undefined,
        bidderId: bidderId || undefined,
      });
      setItems(result.items);
      setTotal(result.meta.totalItems);
      setPage(result.meta.page);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load bid submissions. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setTenderId(tenderFromUrl);
  }, [tenderFromUrl]);

  useEffect(() => {
    setBidderId(bidderFromUrl);
  }, [bidderFromUrl]);

  useEffect(() => {
    if (!accessToken) return;
    void Promise.all([
      listTenders(accessToken, { pageSize: 100 }),
      listBidders(accessToken, { pageSize: 100 }),
    ])
      .then(([tenderResult, bidderResult]) => {
        setTenders(tenderResult.items);
        setBidders(bidderResult.items);
      })
      .catch(() => undefined);
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      void load(accessToken, 1);
    }
  }, [accessToken, pageSize, status, tenderId, bidderId]);

  return (
    <PageContainer
      width="wide"
      breadcrumb={<Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Bids' }]} />}
      title="Bids"
      description={`${total} submission${total === 1 ? '' : 's'}. Open a bid to inspect documents, DEMO SOURCE verification, review, and Officer Review Priority.`}
      actions={canWrite ? <Button onClick={() => navigate('/bharatbid/bids/new')}>Create submission</Button> : null}
    >
      <SessionGate title="Sign in to view bid submissions">
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_14rem_11rem] lg:items-end">
          <Search
            value={search}
            onChange={setSearch}
            onSubmitSearch={() => accessToken && void load(accessToken, 1)}
            placeholder="Search submission, tender, or bidder"
            loading={loading}
          />
          <Select label="Tender" value={tenderId} onChange={(event) => setTenderId(event.target.value)}>
            <option value="">All tenders</option>
            {tenders.map((tender) => (
              <option key={tender.id} value={tender.id}>
                {tender.referenceNumber}
              </option>
            ))}
          </Select>
          <Select label="Bidder" value={bidderId} onChange={(event) => setBidderId(event.target.value)}>
            <option value="">All bidders</option>
            {bidders.map((bidder) => (
              <option key={bidder.id} value={bidder.id}>
                {bidder.legalName}
              </option>
            ))}
          </Select>
          <Select label="Bid status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {BID_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        {error ? (
          <ErrorState message={error} onRetry={() => accessToken && void load(accessToken)} />
        ) : (
          <>
            <DataTable
              columns={[
                { id: 'submissionReference', header: 'Submission reference', accessor: 'submissionReference' },
                {
                  id: 'tender',
                  header: 'Tender',
                  accessor: (row) => (
                    <Link className="underline" to={`/bharatbid/tenders/${row.tenderId}`}>
                      {row.tenderReference}
                    </Link>
                  ),
                },
                {
                  id: 'bidder',
                  header: 'Bidder',
                  accessor: (row) => (
                    <Link className="underline" to={`/bharatbid/bidders/${row.bidderId}`}>
                      {row.bidderLegalName}
                    </Link>
                  ),
                },
                { id: 'status', header: 'Bid status', accessor: (row) => <StatusBadge kind="bid" value={row.status} /> },
                { id: 'createdAt', header: 'Created', accessor: (row) => formatDate(row.createdAt) },
                { id: 'submittedAt', header: 'Submitted', accessor: (row) => formatDate(row.submittedAt) },
                {
                  id: 'actions',
                  header: 'Actions',
                  accessor: (row) => (
                    <Link className="text-sm underline" to={`/bharatbid/bids/${row.id}`}>
                      Open
                    </Link>
                  ),
                },
              ]}
              rows={items}
              rowId={(row) => row.id}
              loading={loading}
              emptyTitle="No bid submissions found."
              onRowClick={(row) => navigate(`/bharatbid/bids/${row.id}`)}
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
