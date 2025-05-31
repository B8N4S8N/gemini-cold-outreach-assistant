import React from 'react';
import { GencoaIcon } from './icons'; 

export const Header: React.FC = () => {
  return (
    <header className="text-center py-6 sm:py-8">
      <div className="flex items-center justify-center mb-3 text-sky-400">
        <GencoaIcon className="w-10 h-10 sm:w-12 sm:h-12 mr-3" />
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300">
          GENCOA
        </h1>
      </div>
      <p className="text-md sm:text-lg text-slate-300 max-w-2xl mx-auto">
        Leverage AI to find leads, gather insights, and draft personalized emails effortlessly.
      </p>
    </header>
  );
};