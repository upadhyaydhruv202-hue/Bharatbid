import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { getApiErrorMessage } from '../../services/api';
import { createBidder } from '../../services/bharatbid';
import { Alert, Breadcrumb, Button, Card, CardTitle, Input, PageContainer, useToast } from '../../ui';

export function BidderCreatePage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [form, setForm] = useState({
    legalName: '',
    tradeName: '',
    pan: '',
    gstin: '',
    cin: '',
    udyamRegistrationNumber: '',
    registeredAddress: '',
    city: '',
    state: '',
    pincode: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });

  function setField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(undefined);
    try {
      const bidder = await createBidder(form, accessToken);
      toast({ title: 'Bidder registered', variant: 'success' });
      navigate(`/bharatbid/bidders/${bidder.id}`);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to register the bidder.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer
      breadcrumb={<Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Bidders', to: '/bharatbid/bidders' }, { label: 'Register' }]} />}
      title="Register bidder"
      description="Capture legal identity and statutory identifiers. Format checks only — these values are not checked against government sources in this slice."
    >
      <SessionGate title="Sign in to register a bidder">
        <Card>
          <form className="grid gap-6" onSubmit={(event) => void onSubmit(event)}>
            {error ? (
              <Alert variant="error" title="Could not save">
                {error}
              </Alert>
            ) : null}
            <section>
              <CardTitle className="mb-4">Identity</CardTitle>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Legal / business name"
                  className="md:col-span-2"
                  value={form.legalName}
                  onChange={(event) => setField('legalName', event.target.value)}
                  required
                />
                <Input
                  label="Trade name"
                  value={form.tradeName}
                  onChange={(event) => setField('tradeName', event.target.value)}
                />
                <Input
                  label="PAN"
                  value={form.pan}
                  onChange={(event) => setField('pan', event.target.value)}
                  hint="Format ABCDE1234F. Format check only."
                />
                <Input
                  label="GSTIN"
                  value={form.gstin}
                  onChange={(event) => setField('gstin', event.target.value)}
                  hint="15-character GST identification number. Format check only."
                />
                <Input label="CIN" value={form.cin} onChange={(event) => setField('cin', event.target.value)} />
                <Input
                  label="Udyam registration"
                  value={form.udyamRegistrationNumber}
                  onChange={(event) => setField('udyamRegistrationNumber', event.target.value)}
                />
                <Input
                  label="Contact email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) => setField('contactEmail', event.target.value)}
                />
                <Input
                  label="Contact phone"
                  value={form.contactPhone}
                  onChange={(event) => setField('contactPhone', event.target.value)}
                  hint="E.164, for example +9198XXXXXXXX"
                />
              </div>
            </section>
            <section>
              <CardTitle className="mb-4">Location</CardTitle>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Registered address"
                  className="md:col-span-2"
                  value={form.registeredAddress}
                  onChange={(event) => setField('registeredAddress', event.target.value)}
                />
                <Input label="City" value={form.city} onChange={(event) => setField('city', event.target.value)} />
                <Input label="State" value={form.state} onChange={(event) => setField('state', event.target.value)} />
                <Input
                  label="PIN code"
                  value={form.pincode}
                  onChange={(event) => setField('pincode', event.target.value)}
                />
                <Input
                  label="Contact name"
                  value={form.contactName}
                  onChange={(event) => setField('contactName', event.target.value)}
                />
              </div>
            </section>
            <div className="flex gap-2">
              <Button type="submit" loading={loading}>
                Register bidder
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/bharatbid/bidders')}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </SessionGate>
    </PageContainer>
  );
}
