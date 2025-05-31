import React from 'react';
import { SavedSearch } from '../types';
import { Button } from './Button';
import { TrashIcon, FolderOpenIcon } from './icons';

interface PastSearchesListProps {
  searches: SavedSearch[];
  onLoadSearch: (searchId: string) => void;
  onDeleteSearch: (searchId: string) => void;
}

export const PastSearchesList: React.FC<PastSearchesListProps> = ({ searches, onLoadSearch, onDeleteSearch }) => {
  if (!searches.length) {
    return <p className="text-slate-400 mt-6 text-center py-10 border border-dashed border-slate-700 rounded-lg">No past research projects found. Start a new one!</p>;
  }
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-sky-300 mb-4 pb-2 border-b border-slate-700">Past Research Projects</h2>
      <ul className="space-y-4">
        {searches.map(search => (
          <li 
            key={search.id} 
            className="p-4 bg-slate-800 rounded-lg shadow-lg hover:shadow-sky-500/20 transition-shadow duration-200 flex flex-col sm:flex-row justify-between sm:items-center"
            aria-labelledby={`search-summary-${search.id}`}
          >
            <div className="mb-3 sm:mb-0">
              <p id={`search-summary-${search.id}`} className="font-medium text-slate-100 break-all">{search.summary || "Untitled Research"}</p>
              <p className="text-xs text-slate-400">
                {new Date(search.timestamp).toLocaleString()} - {search.leads.length} lead(s) found
              </p>
            </div>
            <div className="flex space-x-2 flex-shrink-0">
              <Button 
                variant="secondary" 
                onClick={() => onLoadSearch(search.id)} 
                aria-label={`Load research: ${search.summary || 'Untitled Research'}`}
                className="px-3 py-1.5 text-sm"
              >
                 <FolderOpenIcon className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Load</span>
              </Button>
              <Button 
                variant="danger" 
                onClick={() => onDeleteSearch(search.id)} 
                aria-label={`Delete research: ${search.summary || 'Untitled Research'}`}
                className="px-3 py-1.5 text-sm"
                >
                <TrashIcon className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};