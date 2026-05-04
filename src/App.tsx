import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { api, auth } from './api';
import { Layout } from './Layout';
import { Home } from './pages/Home';
import { Welcome } from './pages/Welcome';
import { Onboarding } from './pages/Onboarding';
import { CreateProfile } from './pages/CreateProfile';
import { Workers } from './pages/Workers';
import { WorkerProfile } from './pages/WorkerProfile';
import { Jobs } from './pages/Jobs';
import { JobDetail } from './pages/JobDetail';
import { PostJob } from './pages/PostJob';
import { Chat, Profile } from './pages/Stub';
import { WasteBuyers } from './pages/WasteBuyers';
import { WasteBuyerProfile } from './pages/WasteBuyerProfile';
import { CreateWasteBuyer } from './pages/CreateWasteBuyer';
import { UslugaProviders } from './pages/UslugaProviders';
import { UslugaProfile } from './pages/UslugaProfile';
import { CreateUsluga } from './pages/CreateUsluga';
import { StanokMasters } from './pages/StanokMasters';
import { StanokProfile } from './pages/StanokProfile';
import { CreateStanok } from './pages/CreateStanok';
import { Delivery } from './pages/Delivery';
import { DeliveryProfile } from './pages/DeliveryProfile';
import { CreateDelivery } from './pages/CreateDelivery';
import { StanokAds } from './pages/StanokAds';
import { StanokAdDetail } from './pages/StanokAdDetail';
import { CreateStanokAd } from './pages/CreateStanokAd';
import { InstallBrigades } from './pages/InstallBrigades';
import { InstallBrigadeProfile } from './pages/InstallBrigadeProfile';
import { CreateInstallBrigade } from './pages/CreateInstallBrigade';
import { Arkachilar } from './pages/Arkachilar';
import { ArkachiProfile } from './pages/ArkachiProfile';
import { CreateArkachi } from './pages/CreateArkachi';
import { Admin } from './pages/Admin';

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function HomeOrWelcome() {
  if (auth.token() && localStorage.getItem('romchi_user_name')) return <Home />;
  return <Navigate to="/welcome" replace />;
}

function App() {
  // On boot, if a token is present but the in-memory user cache is empty
  // (e.g. after a hard reload), hydrate it from /me. On failure, clear the
  // stale token so the UI doesn't pretend the user is logged in.
  React.useEffect(() => {
    if (auth.token() && !auth.user()) {
      api.me()
        .then(m => auth.setUser(m.user))
        .catch(() => auth.clear());
    }
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/" element={<HomeOrWelcome />} />
          <Route path="/romchi-ish" element={<Onboarding />} />
          <Route path="/profile/create" element={<CreateProfile />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/workers/:id" element={<WorkerProfile />} />
          <Route path="/post" element={<PostJob />} />
          <Route path="/atxod" element={<WasteBuyers />} />
          <Route path="/atxod/create" element={<CreateWasteBuyer />} />
          <Route path="/atxod/:id" element={<WasteBuyerProfile />} />
          <Route path="/usluga" element={<UslugaProviders />} />
          <Route path="/usluga/create" element={<CreateUsluga />} />
          <Route path="/usluga/:id" element={<UslugaProfile />} />
          <Route path="/stanok" element={<StanokMasters />} />
          <Route path="/stanok/create" element={<CreateStanok />} />
          <Route path="/stanok/:id" element={<StanokProfile />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/delivery/create" element={<CreateDelivery />} />
          <Route path="/delivery/:id" element={<DeliveryProfile />} />
          <Route path="/stanok-ads" element={<StanokAds />} />
          <Route path="/stanok-ads/create" element={<CreateStanokAd />} />
          <Route path="/stanok-ads/:id" element={<StanokAdDetail />} />
          <Route path="/stanok-ads/:id/edit" element={<CreateStanokAd />} />
          <Route path="/ustanofka" element={<InstallBrigades />} />
          <Route path="/ustanofka/create" element={<CreateInstallBrigade />} />
          <Route path="/ustanofka/:id" element={<InstallBrigadeProfile />} />
          <Route path="/arkachilar" element={<Arkachilar />} />
          <Route path="/arkachilar/create" element={<CreateArkachi />} />
          <Route path="/arkachilar/:id" element={<ArkachiProfile />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
