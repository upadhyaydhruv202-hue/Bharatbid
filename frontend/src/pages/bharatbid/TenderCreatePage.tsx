import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { TENDER_CATEGORY_OPTIONS } from '../../components/bharatbid/StatusBadge';
import { getApiErrorMessage } from '../../services/api';
import { createTender } from '../../services/bharatbid';
import { Alert, Breadcrumb, Button, Card, CardTitle, Input, PageContainer, Select, useToast } from '../../ui';
import { controlBase, labelClass } from '../../ui/styles';

export function TenderCreatePage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [form, setForm] = useState({
    referenceNumber: '',
    title: '',
    description: '',
    organizationName: 'Chennai Petroleum Corporation Limited',
    departmentName: 'Contracts and Procurement',
    category: 'Goods',
    issueDate: '',
    closingDate: '',
  });

  function setField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    if (form.issueDate && form.closingDate && form.closingDate < form.issueDate) {
      setError('Closing date cannot be earlier than the issue date.');
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const tender = await createTender(form, accessToken);
      toast({ title: 'Tender created as draft', variant: 'success' });
      navigate(`/bharatbid/tenders/${tender.id}`);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to create the tender.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer
      breadcrumb={<Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Tenders', to: '/bharatbid/tenders' }, { label: 'Create' }]} />}
      title="Create tender"
      description="Record the procurement opportunity. Configure requirements next, then open the tender."
    >
      <SessionGate title="Sign in to create a tender">
        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          {error ? (
            <Alert variant="error" title="Could not save">
              {error}
            </Alert>
          ) : null}
          <Card>
            <CardTitle className="mb-4">Basic information</CardTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Reference number"
                hint="Unique GeM-style reference, entered manually"
                value={form.referenceNumber}
                onChange={(event) => setField('referenceNumber', event.target.value)}
                required
              />
              <Select
                label="Category"
                value={form.category}
                options={TENDER_CATEGORY_OPTIONS}
                onChange={(event) => setField('category', event.target.value)}
              />
              <Input
                className="md:col-span-2"
                label="Title"
                value={form.title}
                onChange={(event) => setField('title', event.target.value)}
                required
              />
              <div className="md:col-span-2">
                <label className={labelClass} htmlFor="tender-description">
                  Description
                </label>
                <textarea
                  id="tender-description"
                  className={`${controlBase} mt-1 min-h-[6rem]`}
                  value={form.description}
                  onChange={(event) => setField('description', event.target.value)}
                />
              </div>
            </div>
          </Card>
          <Card>
            <CardTitle className="mb-4">Organization</CardTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Organization"
                value={form.organizationName}
                onChange={(event) => setField('organizationName', event.target.value)}
                required
              />
              <Input
                label="Department"
                value={form.departmentName}
                onChange={(event) => setField('departmentName', event.target.value)}
                required
              />
            </div>
          </Card>
          <Card>
            <CardTitle className="mb-4">Schedule</CardTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Issue date"
                type="date"
                value={form.issueDate}
                onChange={(event) => setField('issueDate', event.target.value)}
                required
              />
              <Input
                label="Closing date"
                type="date"
                value={form.closingDate}
                onChange={(event) => setField('closingDate', event.target.value)}
                required
              />
            </div>
          </Card>
          <p className="text-sm text-foreground-muted">
            The tender is saved as a draft. Add requirements on the next screen, then open it for bids.
          </p>
          <div className="flex gap-2">
            <Button type="submit" loading={loading}>
              Create tender
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/bharatbid/tenders')}>
              Cancel
            </Button>
          </div>
        </form>
      </SessionGate>
    </PageContainer>
  );
}
