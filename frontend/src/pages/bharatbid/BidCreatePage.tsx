import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { getApiErrorMessage } from '../../services/api';
import { createBid, listBidders, listTenders, type BidderListItem, type TenderListItem } from '../../services/bharatbid';
import { Alert, Breadcrumb, Button, Card, PageContainer, Select, useToast } from '../../ui';

export function BidCreatePage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [tenders, setTenders] = useState<TenderListItem[]>([]);
  const [bidders, setBidders] = useState<BidderListItem[]>([]);
  const [tenderId, setTenderId] = useState(params.get('tenderId') ?? '');
  const [bidderId, setBidderId] = useState(params.get('bidderId') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!accessToken) return;
    void Promise.all([
      listTenders(accessToken, { pageSize: 100, status: 'open' }),
      listBidders(accessToken, { pageSize: 100 }),
    ])
      .then(([tenderResult, bidderResult]) => {
        setTenders(tenderResult.items);
        setBidders(bidderResult.items);
      })
      .catch((caught) => setError(getApiErrorMessage(caught, 'Unable to load lookup lists.')));
  }, [accessToken]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(undefined);
    try {
      const bid = await createBid({ tenderId, bidderId }, accessToken);
      toast({ title: 'Bid submission created', variant: 'success' });
      navigate(`/bharatbid/bids/${bid.id}`);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to create the bid submission.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer
      breadcrumb={<Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Bids', to: '/bharatbid/bids' }, { label: 'Create' }]} />}
      title="Create bid submission"
      description="A bidder may have one submission per tender. The tender must be open."
    >
      <SessionGate title="Sign in to create a bid submission">
        <Card>
          <form className="grid max-w-xl gap-4" onSubmit={(event) => void onSubmit(event)}>
            {error ? (
              <Alert variant="error" title="Could not save">
                {error}
              </Alert>
            ) : null}
            <Select
              label="Open tender"
              value={tenderId}
              onChange={(event) => setTenderId(event.target.value)}
              required
              placeholder="Select tender"
              options={tenders.map((tender) => ({
                value: tender.id,
                label: `${tender.referenceNumber} — ${tender.title}`,
              }))}
            />
            <Select
              label="Bidder"
              value={bidderId}
              onChange={(event) => setBidderId(event.target.value)}
              required
              placeholder="Select bidder"
              options={bidders.map((bidder) => ({
                value: bidder.id,
                label: bidder.legalName,
              }))}
            />
            <div className="flex gap-2">
              <Button type="submit" loading={loading} disabled={!tenderId || !bidderId}>
                Create bid
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/bharatbid/bids')}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </SessionGate>
    </PageContainer>
  );
}
