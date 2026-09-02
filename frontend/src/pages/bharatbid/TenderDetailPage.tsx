import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { ConfirmActionModal } from '../../components/bharatbid/ConfirmActionModal';
import { RequirementEditor, type RequirementFormValue } from '../../components/bharatbid/RequirementEditor';
import {
  formatDate,
  REQUIREMENT_TYPE_OPTIONS,
  StatusBadge,
  TENDER_CATEGORY_OPTIONS,
} from '../../components/bharatbid/StatusBadge';
import { hasPermission } from '../../lib/rbac';
import { getApiErrorMessage } from '../../services/api';
import {
  createTenderRequirement,
  downloadTenderEvaluationReport,
  getTender,
  listBids,
  listTenderActivity,
  moveRequirement,
  setRequirementActive,
  updateTender,
  updateTenderRequirement,
  updateTenderStatus,
  type BidListItem,
  type TenderActivityItem,
  type TenderDetail,
  type TenderRequirement,
  type TenderStatusAction,
} from '../../services/bharatbid';
import {
  ActivityFeed,
  Alert,
  Breadcrumb,
  Button,
  Card,
  CardTitle,
  DataTable,
  Dropdown,
  ErrorState,
  Input,
  LoadingState,
  PageContainer,
  Select,
  Tabs,
  useToast,
} from '../../ui';
import { controlBase, labelClass } from '../../ui/styles';

function toDateInput(value: string): string {
  return value.slice(0, 10);
}

export function TenderDetailPage() {
  const { id = '' } = useParams();
  const { accessToken, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tender, setTender] = useState<TenderDetail>();
  const [activity, setActivity] = useState<TenderActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [pendingAction, setPendingAction] = useState<TenderStatusAction>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TenderRequirement | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<TenderRequirement>();
  const [formError, setFormError] = useState<string>();
  const canWrite = hasPermission(user, 'tenders.write');
  const canReport = hasPermission(user, 'bids.write');
  const [reporting, setReporting] = useState(false);

  async function load(token: string) {
    setLoading(true);
    setError(undefined);
    try {
      const [detail, events] = await Promise.all([getTender(id, token), listTenderActivity(id, token)]);
      setTender(detail);
      setActivity(events);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load this tender.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken && id) {
      void load(accessToken);
    }
  }, [accessToken, id]);

  async function applyStatus(action: TenderStatusAction) {
    if (!accessToken) return;
    setSaving(true);
    try {
      setTender(await updateTenderStatus(id, action.to, accessToken));
      setActivity(await listTenderActivity(id, accessToken));
      toast({ title: action.label, variant: 'success' });
      setPendingAction(undefined);
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Status update failed'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function saveRequirement(value: RequirementFormValue) {
    if (!accessToken) return;
    setSaving(true);
    setFormError(undefined);
    const sortOrder = value.sortOrder === '' ? undefined : Number(value.sortOrder);
    try {
      if (editing) {
        await updateTenderRequirement(
          id,
          editing.id,
          {
            name: value.name,
            description: value.description,
            requirementType: value.requirementType,
            mandatory: value.mandatory,
            active: value.active,
            sortOrder,
          },
          accessToken,
        );
      } else {
        await createTenderRequirement(
          id,
          {
            name: value.name,
            description: value.description,
            requirementType: value.requirementType,
            mandatory: value.mandatory,
            active: value.active,
            sortOrder,
          },
          accessToken,
        );
      }
      setEditorOpen(false);
      setEditing(null);
      toast({ title: editing ? 'Requirement updated' : 'Requirement added', variant: 'success' });
      await load(accessToken);
    } catch (caught) {
      setFormError(getApiErrorMessage(caught, 'Could not save the requirement.'));
    } finally {
      setSaving(false);
    }
  }

  const locks = tender?.fieldLocks;
  const readOnly = !canWrite || Boolean(locks?.all);

  return (
    <PageContainer
      width="wide"
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Command Center', to: '/bharatbid' },
            { label: 'Tenders', to: '/bharatbid/tenders' },
            { label: tender?.referenceNumber ?? 'Tender' },
          ]}
        />
      }
      title={tender?.title ?? 'Tender'}
      description={tender ? `${tender.referenceNumber} · ${tender.organizationName}` : 'Procurement workspace'}
      actions={
        <div className="flex flex-wrap gap-2">
          {canWrite && tender
            ? tender.allowedStatusActions.map((action) => (
                <Button
                  key={action.to}
                  variant={action.destructive ? 'danger' : 'primary'}
                  onClick={() => setPendingAction(action)}
                >
                  {action.label}
                </Button>
              ))
            : null}
          {canReport && tender ? (
            <Button
              variant="outline"
              loading={reporting}
              onClick={() =>
                void (async () => {
                  if (!accessToken) return;
                  setReporting(true);
                  try {
                    await downloadTenderEvaluationReport(tender.id, accessToken);
                    toast({ title: 'Evaluation report downloaded', variant: 'success' });
                  } catch (caught) {
                    toast({
                      title: getApiErrorMessage(caught, 'The evaluation report could not be generated.'),
                      variant: 'error',
                    });
                  } finally {
                    setReporting(false);
                  }
                })()
              }
            >
              Generate report
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => navigate('/bharatbid/tenders')}>
            Back to list
          </Button>
        </div>
      }
    >
      <SessionGate title="Sign in to view tender details">
        {loading ? <LoadingState label="Loading tender…" /> : null}
        {error ? <ErrorState message={error} onRetry={() => accessToken && void load(accessToken)} /> : null}
        {tender && !loading ? (
          <Tabs
            items={[
              { id: 'overview', label: 'Overview', content: <OverviewTab tender={tender} canWrite={canWrite} onSaved={setTender} /> },
              {
                id: 'requirements',
                label: `Requirements (${tender.requirementCounts.total})`,
                content: (
                  <RequirementsTab
                    tender={tender}
                    readOnly={readOnly}
                    onAdd={() => {
                      setEditing(null);
                      setFormError(undefined);
                      setEditorOpen(true);
                    }}
                    onEdit={(requirement) => {
                      setEditing(requirement);
                      setFormError(undefined);
                      setEditorOpen(true);
                    }}
                    onMove={async (requirement, direction) => {
                      if (!accessToken) return;
                      try {
                        await moveRequirement(tender.id, requirement.id, direction, accessToken);
                        await load(accessToken);
                      } catch (caught) {
                        toast({ title: getApiErrorMessage(caught, 'Could not reorder'), variant: 'error' });
                      }
                    }}
                    onToggle={(requirement) => {
                      if (requirement.active) {
                        setDeactivateTarget(requirement);
                        return;
                      }
                      if (!accessToken) return;
                      void setRequirementActive(tender.id, requirement.id, true, accessToken)
                        .then(() => load(accessToken))
                        .catch((caught: unknown) =>
                          toast({ title: getApiErrorMessage(caught, 'Could not activate'), variant: 'error' }),
                        );
                    }}
                  />
                ),
              },
              {
                id: 'bids',
                label: `Bid participation (${tender.bidSummary.total})`,
                content: <BidsTab tender={tender} canWrite={hasPermission(user, 'bids.write')} />,
              },
              {
                id: 'activity',
                label: 'Activity',
                content: (
                  <ActivityFeed
                    title="Tender activity"
                    emptyTitle="No recorded activity yet."
                    items={activity.map((item) => ({
                      id: item.id,
                      title: item.actorName ? `${item.actorName} ${item.title}` : item.title,
                      timestamp: formatDate(item.timestamp),
                    }))}
                  />
                ),
              },
            ]}
          />
        ) : null}
      </SessionGate>

      <RequirementEditor
        open={editorOpen}
        title={editing ? 'Edit requirement' : 'Add requirement'}
        initial={editing}
        lockCore={Boolean(locks?.requirementCore && editing)}
        loading={saving}
        error={formError}
        onClose={() => setEditorOpen(false)}
        onSubmit={(value) => void saveRequirement(value)}
      />
      <ConfirmActionModal
        open={Boolean(pendingAction)}
        title={pendingAction?.label ?? 'Confirm'}
        description={
          pendingAction?.destructive
            ? 'This cancels the tender. It cannot be reopened from this workspace.'
            : `Change status to “${pendingAction?.label ?? ''}”?`
        }
        confirmLabel={pendingAction?.label ?? 'Confirm'}
        destructive={pendingAction?.destructive}
        loading={saving}
        onClose={() => setPendingAction(undefined)}
        onConfirm={() => pendingAction && void applyStatus(pendingAction)}
      />
      <ConfirmActionModal
        open={Boolean(deactivateTarget)}
        title="Deactivate requirement"
        description={`“${deactivateTarget?.name ?? ''}” will remain on the tender but will not be treated as active configuration.`}
        confirmLabel="Deactivate"
        destructive
        onClose={() => setDeactivateTarget(undefined)}
        onConfirm={() => {
          if (!accessToken || !deactivateTarget) return;
          void setRequirementActive(id, deactivateTarget.id, false, accessToken)
            .then(async () => {
              setDeactivateTarget(undefined);
              await load(accessToken);
            })
            .catch((caught: unknown) =>
              toast({ title: getApiErrorMessage(caught, 'Could not deactivate'), variant: 'error' }),
            );
        }}
      />
    </PageContainer>
  );
}

function OverviewTab({
  tender,
  canWrite,
  onSaved,
}: {
  tender: TenderDetail;
  canWrite: boolean;
  onSaved: (tender: TenderDetail) => void;
}) {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const editable = canWrite && !tender.fieldLocks.all;
  const [form, setForm] = useState({
    title: tender.title,
    description: tender.description ?? '',
    organizationName: tender.organizationName,
    departmentName: tender.departmentName,
    category: tender.category,
    issueDate: toDateInput(tender.issueDate),
    closingDate: toDateInput(tender.closingDate),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      title: tender.title,
      description: tender.description ?? '',
      organizationName: tender.organizationName,
      departmentName: tender.departmentName,
      category: tender.category,
      issueDate: toDateInput(tender.issueDate),
      closingDate: toDateInput(tender.closingDate),
    });
  }, [tender]);

  async function save() {
    if (!accessToken) return;
    setSaving(true);
    try {
      onSaved(
        await updateTender(
          tender.id,
          {
            title: form.title,
            description: form.description,
            organizationName: form.organizationName,
            departmentName: form.departmentName,
            category: form.category,
            issueDate: tender.status === 'draft' && !tender.fieldLocks.closingDate ? form.issueDate : undefined,
            closingDate: tender.fieldLocks.closingDate ? undefined : form.closingDate,
          },
          accessToken,
        ),
      );
      toast({ title: 'Tender updated', variant: 'success' });
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Could not update tender'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-foreground-muted">{tender.referenceNumber}</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{tender.title}</p>
            <p className="mt-1 text-sm text-foreground-muted">
              {tender.organizationName}
              {tender.departmentName ? ` · ${tender.departmentName}` : ''}
            </p>
          </div>
          <StatusBadge kind="tender" value={tender.status} />
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Category" value={tender.category} />
          <Field label="Issue date" value={formatDate(tender.issueDate)} />
          <Field label="Submission deadline" value={formatDate(tender.closingDate)} />
          <Field label="Bidders" value={String(tender.bidSummary.total)} />
        </dl>
        <div className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
          <div className="rounded-md border border-edge px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">Requirements</p>
            <p className="mt-1 font-semibold">{tender.requirementCounts.total}</p>
          </div>
          <div className="rounded-md border border-edge px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">Active</p>
            <p className="mt-1 font-semibold">{tender.requirementCounts.active}</p>
          </div>
          <div className="rounded-md border border-edge px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">Mandatory</p>
            <p className="mt-1 font-semibold">{tender.requirementCounts.mandatory}</p>
          </div>
          <div className="rounded-md border border-edge px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">Submitted bids</p>
            <p className="mt-1 font-semibold">{tender.bidSummary.submitted}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-foreground-muted">
          Tender configuration completeness is operational only. It is not a compliance or risk score.
        </p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StatusBadge kind="tender" value={tender.status} />
          <span className="text-sm text-foreground-muted">{tender.referenceNumber}</span>
        </div>
        {editable ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              className="md:col-span-2"
              label="Title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="edit-description">
                Description
              </label>
              <textarea
                id="edit-description"
                className={`${controlBase} mt-1 min-h-[5rem]`}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <Select
              label="Category"
              value={form.category}
              options={TENDER_CATEGORY_OPTIONS}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            />
            <Input
              label="Organization"
              value={form.organizationName}
              onChange={(event) => setForm((current) => ({ ...current, organizationName: event.target.value }))}
            />
            <Input
              label="Department"
              value={form.departmentName}
              onChange={(event) => setForm((current) => ({ ...current, departmentName: event.target.value }))}
            />
            <Input
              label="Issue date"
              type="date"
              value={form.issueDate}
              disabled={tender.status !== 'draft'}
              onChange={(event) => setForm((current) => ({ ...current, issueDate: event.target.value }))}
            />
            <Input
              label="Closing date"
              type="date"
              value={form.closingDate}
              disabled={tender.fieldLocks.closingDate}
              hint={tender.fieldLocks.closingDate ? 'Locked after bid participation' : undefined}
              onChange={(event) => setForm((current) => ({ ...current, closingDate: event.target.value }))}
            />
            <div className="md:col-span-2">
              <Button loading={saving} onClick={() => void save()}>
                Save details
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Organization" value={tender.organizationName} />
            <Field label="Department" value={tender.departmentName} />
            <Field label="Category" value={tender.category} />
            <Field label="Issue date" value={formatDate(tender.issueDate)} />
            <Field label="Closing date" value={formatDate(tender.closingDate)} />
            <Field label="Created by" value={tender.createdBy?.displayName ?? '—'} />
            <Field label="Created" value={formatDate(tender.createdAt)} />
            {tender.description ? (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-foreground-muted">Description</dt>
                <dd className="mt-1 text-sm leading-6">{tender.description}</dd>
              </div>
            ) : null}
          </dl>
        )}
      </Card>
      <Card>
        <CardTitle className="mb-3">Configuration readiness</CardTitle>
        <p className="mb-3 text-xs text-foreground-muted">Operational completeness only. Not a compliance score.</p>
        <ul className="space-y-2">
          {tender.readiness.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <span aria-hidden="true">{item.passed ? '✓' : '○'}</span>
              <span>
                {item.label}
                <span className="sr-only">{item.passed ? ' complete' : ' incomplete'}</span>
              </span>
            </li>
          ))}
        </ul>
        {tender.status === 'draft' && !tender.readiness.readyToOpen ? (
          <Alert variant="warning" title="Not ready to open" className="mt-4">
            Add at least one active requirement before opening this tender.
          </Alert>
        ) : null}
      </Card>
    </div>
    </div>
  );
}

function RequirementsTab({
  tender,
  readOnly,
  onAdd,
  onEdit,
  onMove,
  onToggle,
}: {
  tender: TenderDetail;
  readOnly: boolean;
  onAdd: () => void;
  onEdit: (requirement: TenderRequirement) => void;
  onMove: (requirement: TenderRequirement, direction: 'up' | 'down') => void;
  onToggle: (requirement: TenderRequirement) => void;
}) {
  const counts = tender.requirementCounts;
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Tender requirements</CardTitle>
          <p className="mt-1 text-xs text-foreground-muted">
            {counts.total} total · {counts.mandatory} mandatory · {counts.optional} optional · {counts.active} active
          </p>
        </div>
        {readOnly ? null : <Button onClick={onAdd}>Add requirement</Button>}
      </div>
      <DataTable
        columns={[
          { id: 'name', header: 'Requirement', accessor: 'name', className: 'min-w-[12rem]' },
          {
            id: 'type',
            header: 'Type',
            accessor: (row) =>
              REQUIREMENT_TYPE_OPTIONS.find((option) => option.value === row.requirementType)?.label ??
              row.requirementType,
          },
          { id: 'mandatory', header: 'Mandatory', accessor: (row) => (row.mandatory ? 'Required' : 'Optional') },
          { id: 'active', header: 'Status', accessor: (row) => (row.active ? 'Active' : 'Inactive') },
          { id: 'sortOrder', header: 'Order', accessor: 'sortOrder' },
          {
            id: 'actions',
            header: 'Actions',
            accessor: (row) =>
              readOnly ? (
                <span className="text-xs text-foreground-muted">View only</span>
              ) : (
                <div className="flex flex-wrap items-center gap-1" onClick={(event) => event.stopPropagation()}>
                  <Button size="sm" variant="ghost" aria-label="Move up" onClick={() => onMove(row, 'up')}>
                    Up
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Move down" onClick={() => onMove(row, 'down')}>
                    Down
                  </Button>
                  <Dropdown
                    label="Requirement actions"
                    trigger={
                      <Button size="sm" variant="outline" aria-label="More actions">
                        ⋮
                      </Button>
                    }
                    items={[
                      { id: 'edit', label: 'Edit', onSelect: () => onEdit(row) },
                      {
                        id: 'toggle',
                        label: row.active ? 'Deactivate' : 'Activate',
                        destructive: row.active,
                        onSelect: () => onToggle(row),
                      },
                    ]}
                  />
                </div>
              ),
          },
        ]}
        rows={tender.requirements}
        rowId={(row) => row.id}
        emptyTitle="No requirements configured for this tender."
        emptyDescription="Add statutory, eligibility, and document requirements before opening."
      />
    </Card>
  );
}

function BidsTab({ tender, canWrite }: { tender: TenderDetail; canWrite: boolean }) {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<BidListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const summary = tender.bidSummary;
  const stats = [
    { label: 'Total bids', value: summary.total },
    { label: 'Submitted', value: summary.submitted },
    { label: 'Draft', value: summary.draft },
    { label: 'Under review', value: summary.underReview },
    { label: 'Withdrawn', value: summary.withdrawn },
    { label: 'Finalized', value: summary.finalized },
  ];

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(undefined);
    void listBids(accessToken, { tenderId: tender.id, pageSize: 50 })
      .then((result) => setItems(result.items))
      .catch((caught: unknown) => setError(getApiErrorMessage(caught, 'Unable to load bid participation.')))
      .finally(() => setLoading(false));
  }, [accessToken, tender.id]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Bid participation</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/bharatbid/evaluation/${tender.id}`)}>
            Open evaluation
          </Button>
          {canWrite && tender.status === 'open' ? (
            <Button size="sm" onClick={() => navigate(`/bharatbid/bids/new?tenderId=${tender.id}`)}>
              Create submission
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-lg border border-edge px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-foreground-muted">{item.label}</p>
            <p className="mt-1 text-lg font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      {error ? <ErrorState message={error} /> : null}
      <DataTable
        columns={[
          {
            id: 'bidder',
            header: 'Bidder',
            accessor: (row) => (
              <Link className="underline" to={`/bharatbid/bidders/${row.bidderId}`}>
                {row.bidderLegalName}
              </Link>
            ),
          },
          { id: 'ref', header: 'Submission reference', accessor: 'submissionReference' },
          { id: 'status', header: 'Status', accessor: (row) => <StatusBadge kind="bid" value={row.status} /> },
          { id: 'submittedAt', header: 'Submitted at', accessor: (row) => formatDate(row.submittedAt) },
          {
            id: 'action',
            header: 'Action',
            accessor: (row) => (
              <Link className="text-sm underline" to={`/bharatbid/bids/${row.id}`}>
                Open bid
              </Link>
            ),
          },
        ]}
        rows={items}
        rowId={(row) => row.id}
        loading={loading}
        emptyTitle="No bids have been submitted for this tender."
        onRowClick={(row) => navigate(`/bharatbid/bids/${row.id}`)}
      />
      <Link className="mt-4 inline-block text-sm underline" to={`/bharatbid/bids?tenderId=${tender.id}`}>
        View all submissions for this tender
      </Link>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-foreground-muted">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
