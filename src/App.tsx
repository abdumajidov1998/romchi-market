import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { Home } from './pages/Home';
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

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/romchi-ish" element={<Onboarding />} />
          <Route path="/profile/create" element={<CreateProfile />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/workers/:id" element={<WorkerProfile />} />
          <Route path="/post" element={<PostJob />} />
          <Route path="/atxod" element={<WasteBuyers />} />
          <Route path="/atxod/:id" element={<WasteBuyerProfile />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
