
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreatePostPage from './pages/CreatePostPage';
import ResultsPage from './pages/ResultsPage';
import HistoryPage from './pages/HistoryPage';
import PricingPage from './pages/PricingPage';
import FAQPage from './pages/FAQPage';
import LimitReachedPage from './pages/LimitReachedPage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { GeneratedPost, User } from './types';

const App: React.FC = () => {
  const [lastResult, setLastResult] = useState<GeneratedPost | null>(null);
  const [history, setHistory] = useState<GeneratedPost[]>([]);
  const [user, setUser] = useState<User>({
    isLoggedIn: true,
    plan: 'Free',
    remainingCredits: 3
  });

  const addHistory = (post: GeneratedPost) => {
    setHistory(prev => [post, ...prev]);
    setLastResult(post);
    setUser(prev => ({ ...prev, remainingCredits: Math.max(0, prev.remainingCredits - 1) }));
  };

  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar user={user} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreatePostPage onGenerate={addHistory} user={user} />} />
            <Route path="/results" element={lastResult ? <ResultsPage post={lastResult} /> : <Navigate to="/create" />} />
            <Route path="/history" element={<HistoryPage history={history} />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/limit-reached" element={<LimitReachedPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  );
};

export default App;
