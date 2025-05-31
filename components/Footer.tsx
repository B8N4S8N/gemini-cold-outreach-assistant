
import React from 'react';

interface FooterProps {
  onChangeApiKey?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onChangeApiKey }) => {
  return (
    <footer className="text-center py-8 mt-12 border-t border-slate-700">
      <p className="text-sm text-slate-400">
        Powered by Gemini API. &copy; {new Date().getFullYear()} <a href="https://fortify.framer.media/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">Fortified Media</a>.
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Remember to review and customize all generated content before sending.
      </p>
      {onChangeApiKey && (
        <div className="mt-4">
          <button
            onClick={onChangeApiKey}
            className="text-xs text-slate-500 hover:text-sky-400 underline focus:outline-none focus:ring-1 focus:ring-sky-400 rounded"
            aria-label="Change or Clear API Key"
          >
            Change or Clear API Key
          </button>
        </div>
      )}
    </footer>
  );
};
