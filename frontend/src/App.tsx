import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './auth/AuthProvider';
import { FeatureProvider } from './features';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { BharatBidOverviewPage } from './pages/bharatbid/OverviewPage';
import { TendersPage } from './pages/bharatbid/TendersPage';
import { TenderCreatePage } from './pages/bharatbid/TenderCreatePage';
import { TenderDetailPage } from './pages/bharatbid/TenderDetailPage';
import { BiddersPage } from './pages/bharatbid/BiddersPage';
import { BidderCreatePage } from './pages/bharatbid/BidderCreatePage';
import { BidderDetailPage } from './pages/bharatbid/BidderDetailPage';
import { BidsPage } from './pages/bharatbid/BidsPage';
import { BidCreatePage } from './pages/bharatbid/BidCreatePage';
import { BidDetailPage } from './pages/bharatbid/BidDetailPage';
import { ReviewQueuePage } from './pages/bharatbid/ReviewQueuePage';
import { ReviewDetailPage } from './pages/bharatbid/ReviewDetailPage';
import { IntelligencePage } from './pages/bharatbid/IntelligencePage';
import { EvaluationPage } from './pages/bharatbid/EvaluationPage';
import { EvaluationWorkspacePage } from './pages/bharatbid/EvaluationWorkspacePage';
import { ActivityPage } from './pages/bharatbid/ActivityPage';
import { BharatBidNotificationsPage } from './pages/bharatbid/NotificationsPage';
import { ApiClientProvider } from './services/api';
import { ThemeProvider, ToastProvider } from './ui';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ApiClientProvider>
            <FeatureProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Navigate to="/bharatbid" replace />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/bharatbid" element={<BharatBidOverviewPage />} />
                    <Route path="/bharatbid/activity" element={<ActivityPage />} />
                    <Route path="/bharatbid/notifications" element={<BharatBidNotificationsPage />} />
                    <Route path="/bharatbid/tenders" element={<TendersPage />} />
                    <Route path="/bharatbid/tenders/new" element={<TenderCreatePage />} />
                    <Route path="/bharatbid/tenders/:id" element={<TenderDetailPage />} />
                    <Route path="/bharatbid/bidders" element={<BiddersPage />} />
                    <Route path="/bharatbid/bidders/new" element={<BidderCreatePage />} />
                    <Route path="/bharatbid/bidders/:id" element={<BidderDetailPage />} />
                    <Route path="/bharatbid/bids" element={<BidsPage />} />
                    <Route path="/bharatbid/bids/new" element={<BidCreatePage />} />
                    <Route path="/bharatbid/bids/:id" element={<BidDetailPage />} />
                    <Route path="/bharatbid/bids/:id/documents" element={<BidDetailPage />} />
                    <Route path="/bharatbid/bids/:id/verification" element={<BidDetailPage />} />
                    <Route path="/bharatbid/bids/:id/cross-checks" element={<BidDetailPage />} />
                    <Route path="/bharatbid/bids/:id/requirements" element={<BidDetailPage />} />
                    <Route path="/bharatbid/bids/:id/review" element={<BidDetailPage />} />
                    <Route path="/bharatbid/bids/:id/intelligence" element={<BidDetailPage />} />
                    <Route path="/bharatbid/bids/:id/evaluation" element={<BidDetailPage />} />
                    <Route path="/bharatbid/bids/:id/activity" element={<BidDetailPage />} />
                    <Route path="/bharatbid/review" element={<ReviewQueuePage />} />
                    <Route path="/bharatbid/review/:id" element={<ReviewDetailPage />} />
                    <Route path="/bharatbid/intelligence" element={<IntelligencePage />} />
                    <Route path="/bharatbid/evaluation" element={<EvaluationPage />} />
                    <Route path="/bharatbid/evaluation/:tenderId" element={<EvaluationWorkspacePage />} />
                    <Route path="/bharatbid/evaluation/:tenderId/compare" element={<EvaluationWorkspacePage />} />
                    <Route path="*" element={<Navigate to="/bharatbid" replace />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </FeatureProvider>
          </ApiClientProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
