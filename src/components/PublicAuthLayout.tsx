'use client';

import React from 'react';
import { LandingNavbar } from '@/components/LandingNavbar';
import { LandingFooter } from '@/components/LandingFooter';

interface PublicAuthLayoutProps {
  children: React.ReactNode;
}

export const PublicAuthLayout: React.FC<PublicAuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Sticky Marketing / Public Navbar */}
      <LandingNavbar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Public Marketing / Legal Footer */}
      <LandingFooter />
    </div>
  );
};
