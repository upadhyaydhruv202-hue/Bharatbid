import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import {
  formatDate,
  StatusBadge,
  TENDER_CATEGORY_OPTIONS,
  TENDER_STATUS_OPTIONS,
} from '../../components/bharatbid/StatusBadge';
import { hasPermission } from '../../lib/rbac';
import { getApiErrorMessage } from '../../services/api';
import { listTenders, type TenderListItem } from '../../services/bharatbid';
import {
  Breadcrumb,
  Button,
  DataTable,
  ErrorState,
  PageContainer,
  Pagination,
  Search,
  Select,
} from '../../ui';

export function TendersPage() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<TenderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('closingDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const canWrite = hasPermission(user, 'tenders.write');

  async function load(token: string, nextPage = page) {
    setLoading(true);
    setError(undefined);
    try {
      const result = await listTenders(token, {
        page: nextPage,
        pageSize,
        q: search,
        status: status || undefined,
        category: category || undefined,
        sortBy,
        sortOrder,
      });
      setItems(result.items);
      setTotal(result.meta.totalItems);
      setPage(result.meta.page);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load tenders. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken) {
      void load(accessToken, 1);
    }
  }, [accessToken, pageSize, status, category, sortBy, sortOrder]);

  return (
    <PageContainer
      width="wide"
      breadcrumb={
        <Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Tenders' }]} />
      }
      title="Tenders"
      description="Procurement opportunities. Search by reference or title, then open a workspace to configure requirements."
      actions={
        canWrite ? <Button onClick={() => navigate('/bharatbid/tenders/new')}>Create tender</Button> : null
      }
    >
      <SessionGate title="Sign in to view tenders">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
          <Search
            value={search}
            onChange={setSearch}
            onSubmitSearch={() => accessToken && void load(accessToken, 1)}
            placeholder="Search reference or title"
            loading={loading}
          />
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)} className="lg:w-52">
            <option value="">All statuses</option>
            {TENDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="lg:w-44"
          >
            <option value="">All categories</option>
            {TENDER_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {search || status || category ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setStatus('');
                setCategory('');
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
                { id: 'referenceNumber', header: 'Reference', accessor: 'referenceNumber', sortable: true },
                { id: 'title', header: 'Tender', accessor: 'title', className: 'min-w-[14rem]' },
                { id: 'category', header: 'Category', accessor: 'category' },
                { id: 'organizationName', header: 'Organization', accessor: 'organizationName' },
                {
                  id: 'closingDate',
                  header: 'Closing date',
                  sortable: true,
                  accessor: (row) => formatDate(row.closingDate),
                },
                { id: 'requirementCount', header: 'Requirements', accessor: (row) => row.requirementCount ?? 0 },
                { id: 'bidCount', header: 'Bids', accessor: 'bidCount' },
                { id: 'status', header: 'Status', sortable: true, accessor: (row) => <StatusBadge kind="tender" value={row.status} /> },
                {
                  id: 'actions',
                  header: 'Actions',
                  accessor: (row) => (
                    <Link className="text-sm underline" to={`/bharatbid/tenders/${row.id}`}>
                      View →
                    </Link>
                  ),
                },
              ]}
              rows={items}
              rowId={(row) => row.id}
              loading={loading}
              emptyTitle="No tenders found."
              emptyDescription="Create a tender or adjust the search filters."
              sort={{ id: sortBy, direction: sortOrder }}
              onSortChange={(next) => {
                setSortBy(next.id);
                setSortOrder(next.direction);
              }}
              onRowClick={(row) => navigate(`/bharatbid/tenders/${row.id}`)}
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
