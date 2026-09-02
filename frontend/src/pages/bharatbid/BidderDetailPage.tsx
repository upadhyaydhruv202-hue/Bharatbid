import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { formatDate, PresenceLabel, StatusBadge } from '../../components/bharatbid/StatusBadge';
import { hasPermission } from '../../lib/rbac';
import { getApiErrorMessage } from '../../services/api';
import {
  getBidder,
  listBidderActivity,
  updateBidder,
  type BidderDetail,
  type TenderActivityItem,
} from '../../services/bharatbid';
import {
  ActivityFeed,
  Alert,
  Breadcrumb,
  Button,
  Card,
  CardTitle,
  DataTable,
  ErrorState,
  Input,
  LoadingState,
  PageContainer,
  useToast,
} from '../../ui';

export function BidderDetailPage() {
  const { id = '' } = useParams();
  const { accessToken, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bidder, setBidder] = useState<BidderDetail>();
  const [activity, setActivity] = useState<TenderActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [editing, setEditing] = useState(false);
  const canWrite = hasPermission(user, 'bidders.write');

  async function load(token: string) {
    setLoading(true);
    setError(undefined);
    try {
      const [detail, events] = await Promise.all([getBidder(id, token), listBidderActivity(id, token)]);
      setBidder(detail);
      setActivity(events);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load this bidder.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken && id) {
      void load(accessToken);
    }
  }, [accessToken, id]);

  return (
    <PageContainer
      width="wide"
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Command Center', to: '/bharatbid' },
            { label: 'Bidders', to: '/bharatbid/bidders' },
            { label: bidder?.legalName ?? 'Bidder' },
          ]}
        />
      }
      title={bidder?.legalName ?? 'Bidder profile'}
      description="Identity, location, and tender participation. Identifiers are recorded, not government-verified."
      actions={
        <div className="flex flex-wrap gap-2">
          {canWrite && bidder && !editing ? (
            <Button onClick={() => setEditing(true)}>Edit profile</Button>
          ) : null}
          <Button variant="outline" onClick={() => navigate('/bharatbid/bidders')}>
            Back to list
          </Button>
        </div>
      }
    >
      <SessionGate title="Sign in to view bidder profiles">
        {loading ? <LoadingState label="Loading bidder…" /> : null}
        {error ? <ErrorState message={error} onRetry={() => accessToken && void load(accessToken)} /> : null}
        {bidder && !loading ? (
          <div className="space-y-6">
            {editing && canWrite ? (
              <BidderEditForm
                bidder={bidder}
                saving={saving}
                error={formError}
                onCancel={() => {
                  setEditing(false);
                  setFormError(undefined);
                }}
                onSubmit={async (input) => {
                  if (!accessToken) return;
                  setSaving(true);
                  setFormError(undefined);
                  try {
                    const updated = await updateBidder(id, input, accessToken);
                    setBidder(updated);
                    setActivity(await listBidderActivity(id, accessToken));
                    setEditing(false);
                    toast({ title: 'Bidder updated', variant: 'success' });
                  } catch (caught) {
                    setFormError(getApiErrorMessage(caught, 'Unable to update this bidder.'));
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            ) : (
              <>
              <Card>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">Bidder profile</p>
                <p className="mt-1 text-lg font-semibold tracking-tight">{bidder.legalName}</p>
                {bidder.tradeName ? (
                  <p className="mt-1 text-sm text-foreground-muted">{bidder.tradeName}</p>
                ) : null}
                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Item label="GSTIN" value={bidder.gstin} />
                  <Item label="PAN" value={bidder.pan} />
                  <Item label="Udyam ID" value={bidder.udyamRegistrationNumber} />
                  <Item label="CIN" value={bidder.cin} />
                </dl>
                <p className="mt-3 text-xs text-foreground-muted">
                  Identifiers are recorded as provided. They are not government-verified on this profile.
                </p>
              </Card>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardTitle className="mb-4">Identity</CardTitle>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <Item label="Legal / business name" value={bidder.legalName} />
                    <Item label="Trade name" value={bidder.tradeName} />
                    <Item label="PAN" value={bidder.pan} />
                    <Item label="GSTIN" value={bidder.gstin} />
                    <Item label="CIN" value={bidder.cin} />
                    <Item label="Udyam" value={bidder.udyamRegistrationNumber} />
                    <Item label="Email" value={bidder.contactEmail} />
                    <Item label="Phone" value={bidder.contactPhone} />
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-foreground-muted">PAN status</dt>
                      <dd className="mt-1 text-sm">
                        <PresenceLabel value={bidder.panStatus} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-foreground-muted">GSTIN status</dt>
                      <dd className="mt-1 text-sm">
                        <PresenceLabel value={bidder.gstinStatus} />
                      </dd>
                    </div>
                  </dl>
                </Card>
                <Card>
                  <CardTitle className="mb-4">Location</CardTitle>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <Item label="Address" value={bidder.registeredAddress} />
                    <Item label="City" value={bidder.city} />
                    <Item label="State" value={bidder.state} />
                    <Item label="PIN" value={bidder.pincode} />
                    <Item label="Contact name" value={bidder.contactName} />
                  </dl>
                </Card>
              </div>
              </>
            )}
            <Card>
              <CardTitle className="mb-4">Procurement participation</CardTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Tenders', value: bidder.participation.tenderCount },
                  { label: 'Total bids', value: bidder.participation.total },
                  { label: 'Submitted', value: bidder.participation.submitted },
                  { label: 'Draft', value: bidder.participation.draft },
                  { label: 'Under review', value: bidder.participation.underReview },
                  { label: 'Withdrawn', value: bidder.participation.withdrawn },
                  { label: 'Finalized', value: bidder.participation.finalized },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-edge px-3 py-3">
                    <p className="text-xs uppercase tracking-wide text-foreground-muted">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardTitle className="mb-4">Tender participation</CardTitle>
              <DataTable
                columns={[
                  {
                    id: 'tender',
                    header: 'Tender',
                    accessor: (row) => (
                      <Link className="underline" to={`/bharatbid/tenders/${row.tenderId}`}>
                        {row.tenderTitle || row.tenderReference}
                      </Link>
                    ),
                  },
                  { id: 'reference', header: 'Reference', accessor: 'tenderReference' },
                  { id: 'bidRef', header: 'Bid reference', accessor: 'submissionReference' },
                  { id: 'status', header: 'Bid status', accessor: (row) => <StatusBadge kind="bid" value={row.status} /> },
                  { id: 'submittedAt', header: 'Submitted at', accessor: (row) => formatDate(row.submittedAt) },
                  {
                    id: 'actions',
                    header: 'Actions',
                    accessor: (row) => (
                      <Link className="text-sm underline" to={`/bharatbid/bids/${row.id}`}>
                        Open bid
                      </Link>
                    ),
                  },
                ]}
                rows={bidder.bids}
                rowId={(row) => row.id}
                emptyTitle="This bidder has not participated in any tender yet."
                onRowClick={(row) => navigate(`/bharatbid/bids/${row.id}`)}
              />
            </Card>
            <ActivityFeed
              title="Profile activity"
              emptyTitle="No recorded activity yet."
              items={activity.map((item) => ({
                id: item.id,
                title: item.actorName ? `${item.actorName} ${item.title}` : item.title,
                timestamp: formatDate(item.timestamp),
              }))}
            />
          </div>
        ) : null}
      </SessionGate>
    </PageContainer>
  );
}

function BidderEditForm({
  bidder,
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  bidder: BidderDetail;
  saving: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (input: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    legalName: bidder.legalName,
    tradeName: bidder.tradeName ?? '',
    pan: bidder.pan ?? '',
    gstin: bidder.gstin ?? '',
    cin: bidder.cin ?? '',
    udyamRegistrationNumber: bidder.udyamRegistrationNumber ?? '',
    registeredAddress: bidder.registeredAddress ?? '',
    city: bidder.city ?? '',
    state: bidder.state ?? '',
    pincode: bidder.pincode ?? '',
    contactName: bidder.contactName ?? '',
    contactEmail: bidder.contactEmail ?? '',
    contactPhone: bidder.contactPhone ?? '',
  });

  function setField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <Card>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
        <CardTitle className="md:col-span-2">Edit profile</CardTitle>
        {error ? (
          <Alert variant="error" title="Could not save" className="md:col-span-2">
            {error}
          </Alert>
        ) : null}
        <Input
          label="Legal / business name"
          className="md:col-span-2"
          value={form.legalName}
          onChange={(event) => setField('legalName', event.target.value)}
          required
        />
        <Input label="Trade name" value={form.tradeName} onChange={(event) => setField('tradeName', event.target.value)} />
        <Input label="PAN" value={form.pan} onChange={(event) => setField('pan', event.target.value)} />
        <Input label="GSTIN" value={form.gstin} onChange={(event) => setField('gstin', event.target.value)} />
        <Input label="CIN" value={form.cin} onChange={(event) => setField('cin', event.target.value)} />
        <Input
          label="Udyam"
          value={form.udyamRegistrationNumber}
          onChange={(event) => setField('udyamRegistrationNumber', event.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={form.contactEmail}
          onChange={(event) => setField('contactEmail', event.target.value)}
        />
        <Input label="Phone" value={form.contactPhone} onChange={(event) => setField('contactPhone', event.target.value)} />
        <Input
          label="Address"
          className="md:col-span-2"
          value={form.registeredAddress}
          onChange={(event) => setField('registeredAddress', event.target.value)}
        />
        <Input label="City" value={form.city} onChange={(event) => setField('city', event.target.value)} />
        <Input label="State" value={form.state} onChange={(event) => setField('state', event.target.value)} />
        <Input label="PIN" value={form.pincode} onChange={(event) => setField('pincode', event.target.value)} />
        <Input
          label="Contact name"
          value={form.contactName}
          onChange={(event) => setField('contactName', event.target.value)}
        />
        <div className="md:col-span-2 flex gap-2">
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Item({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-foreground-muted">{label}</dt>
      <dd className="mt-1 text-sm">{value || '—'}</dd>
    </div>
  );
}
