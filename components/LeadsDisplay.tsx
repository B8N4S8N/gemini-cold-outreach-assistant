
import React from 'react';
import { ProcessedLead } from '../types';
import { LeadCard } from './LeadCard';

interface LeadsDisplayProps {
  leads: ProcessedLead[];
}

export const LeadsDisplay: React.FC<LeadsDisplayProps> = ({ leads }) => {
  if (leads.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-slate-400 text-lg">No leads to display yet. Start your research above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-sky-400 mb-6 border-b-2 border-slate-700 pb-3">Generated Leads & Outreach Drafts</h2>
      {leads.map(lead => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
};
