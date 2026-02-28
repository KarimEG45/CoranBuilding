'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BuildingView from '@/components/dashboard/BuildingView';
import PageModal from '@/components/dashboard/PageModal';
import LoginModal from '@/components/dashboard/LoginModal';
import ShareModal from '@/components/dashboard/ShareModal';

type PageStatus = 'locked' | 'started' | 'revise' | 'mastered';

export default function DashboardPage() {
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [progress, setProgress] = useState<Record<number, PageStatus>>({});
  const [userStats, setUserStats] = useState({ mastered: 0, total: 604, percentage: 0, streak: 0 });
  const [showShare, setShowShare] = useState(false);

  // Auth State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    const token = sessionStorage.getItem('access_token');
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    try {
      const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };

      // 1. Fetch User
      const userRes = await fetch('http://localhost:8001/api/v1/users/me', { headers });
      if (!userRes.ok) {
        // Token expired or invalid
        sessionStorage.removeItem('access_token');
        setShowLoginModal(true);
        return;
      }

      const userData = await userRes.json();
      setCurrentUser(userData);

      await fetchData(headers, userData); // Pass headers and user data
    } catch (e) {
      console.error("Auth check failed", e);
      setShowLoginModal(true);
    }
  };

  const fetchData = async (headers: HeadersInit, userData: any) => {
    try {
      // 2. Fetch Progress (Using passed headers)
      const progressRes = await fetch('http://localhost:8001/api/v1/users/me/progress', { headers });
      const progressData: Record<number, string> = progressRes.ok ? await progressRes.json() : {};

      // Convert backend status to frontend status if needed (strings match mostly)
      const formattedProgress: Record<number, PageStatus> = {};
      Object.entries(progressData).forEach(([page, status]) => {
        formattedProgress[parseInt(page)] = status as PageStatus;
      });

      // 3. Calculate Stats
      let masteredCount = 0;
      Object.values(formattedProgress).forEach(status => {
        if (status === 'mastered') masteredCount++;
      });

      const total = 604;
      const percentage = (masteredCount / total) * 100;

      setProgress(formattedProgress);
      setUserStats({
        mastered: masteredCount,
        total,
        percentage,
        streak: userData.daily_streak || 0
      });

    } catch (e) {
      console.error("Failed to fetch dashboard data", e);
    }
  };

  const handleLoginSuccess = (token: string, user: any) => {
    sessionStorage.setItem('access_token', token);
    setCurrentUser(user);
    setShowLoginModal(false);
    // Fetch data for new user
    fetchData({ 'Authorization': `Bearer ${token}` }, user);
  };

  const handlePageClick = (page: number) => {
    setSelectedPage(page);
  };

  const handleCloseModal = () => {
    setSelectedPage(null);
  };

  const handleNextPage = () => {
    if (selectedPage && selectedPage < 604) setSelectedPage(selectedPage + 1);
  };

  const handlePrevPage = () => {
    if (selectedPage && selectedPage > 1) setSelectedPage(selectedPage - 1);
  };

  const handleStatusChange = async (status: PageStatus) => {
    if (selectedPage) {
      // Optimistic update
      const newProgress = { ...progress, [selectedPage]: status };
      setProgress(newProgress);

      // Recalculate stats immediately
      let masteredCount = 0;
      Object.values(newProgress).forEach(s => {
        if (s === 'mastered') masteredCount++;
      });
      setUserStats(prev => ({
        ...prev,
        mastered: masteredCount,
        percentage: (masteredCount / 604) * 100
      }));

      // Save to backend
      const token = sessionStorage.getItem('access_token');
      if (token) {
        fetch('http://localhost:8001/api/v1/users/me/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ page: selectedPage, status })
        }).catch(err => console.error("Failed to save progress", err));
      }
    }
  };

  return (
    <DashboardLayout stats={userStats} user={currentUser} onShare={() => setShowShare(true)} progress={progress}>
      <div className="max-w-fit mx-auto px-4">
        {/* Header Stats */}
        <div className="flex justify-between items-end mb-8 w-full max-w-[1350px] mx-auto">
          <div>
            <h1 className="text-3xl font-bold font-display text-slate-800">Tableau de Bord</h1>
            <p className="text-slate-500 mt-1">
              {currentUser ? `Bienvenue, ${currentUser.username}.` : "Suivez votre progression à travers l'immeuble coranique."}
            </p>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-100">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm font-medium text-slate-600">Maîtrisé</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-100">
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div>
              <span className="text-sm font-medium text-slate-600">À Réviser</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-100">
              <div className="w-3 h-3 rounded-full bg-blue-300"></div>
              <span className="text-sm font-medium text-slate-600">En Cours</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-100">
              <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              <span className="text-sm font-medium text-slate-600">Non Débuté</span>
            </div>
          </div>
        </div>

        {/* Building Visualization */}
        <BuildingView
          onPageClick={handlePageClick}
          progress={progress}
        />

        {/* Modal */}
        {selectedPage && (
          <PageModal
            page={selectedPage}
            isOpen={!!selectedPage}
            onClose={handleCloseModal}
            onNext={handleNextPage}
            onPrev={handlePrevPage}
            currentStatus={progress[selectedPage] || 'locked'}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onLoginSuccess={handleLoginSuccess}
        />

        {/* Share Modal */}
        <ShareModal
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          username={currentUser?.username || 'Invité'}
          stats={userStats}
          progress={progress}
        />
      </div>
    </DashboardLayout>
  );
}
