
import React, { useState } from 'react';
import { ProcessedLead } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { CopyIcon, CheckIcon, ErrorIcon, LightbulbIcon, EmailIcon, LinkIcon as SourceLinkIcon } from './icons'; // Renamed LinkIcon to SourceLinkIcon for clarity

interface LeadCardProps {
  lead: ProcessedLead;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    if (lead.emailBody) {
      const fullEmail = `Subject: ${lead.emailSubject}\n\n${lead.emailBody}`;
      navigator.clipboard.writeText(fullEmail).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };
  
  const renderStatusIndicator = () => {
    switch(lead.status) {
      case 'initial':
      case 'fetching_details':
        return <div className="flex items-center text-xs text-amber-400"><LoadingSpinner size="xs" /><span className="ml-1">Searching & Fetching details...</span></div>;
      case 'fetching_email':
        return <div className="flex items-center text-xs text-amber-400"><LoadingSpinner size="xs" /><span className="ml-1">Drafting email...</span></div>;
      case 'completed':
        return <div className="flex items-center text-xs text-green-400"><CheckIcon className="w-4 h-4" /><span className="ml-1">Ready</span></div>;
      case 'error_details':
      case 'error_email':
        return <div className="flex items-center text-xs text-red-400"><ErrorIcon className="w-4 h-4" /><span className="ml-1">Error</span></div>;
      default:
        return null;
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg shadow-xl overflow-hidden transition-all duration-300 hover:shadow-sky-500/30">
      <div className="p-5 sm:p-6 border-b border-slate-700">
        <div className="flex justify-between items-start">
          <h3 className="text-xl sm:text-2xl font-semibold text-sky-400">{lead.name}</h3>
          {renderStatusIndicator()}
        </div>
      </div>

      {(lead.status === 'error_details' || lead.status === 'error_email') && lead.errorMessage && (
         <div className="p-5 sm:p-6 bg-red-900/30">
            <div className="flex items-center text-red-300">
                <ErrorIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                <p className="text-sm ">{lead.errorMessage}</p>
            </div>
        </div>
      )}

      {lead.details && lead.details.length > 0 && (
        <div className="p-5 sm:p-6 border-b border-slate-700">
          <h4 className="text-md font-semibold text-sky-300 mb-2 flex items-center">
            <LightbulbIcon className="w-5 h-5 mr-2 text-yellow-400" />
            Personalized Insights:
          </h4>
          <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm pl-2">
            {lead.details.map((detail, index) => (
              <li key={index}>{detail}</li>
            ))}
          </ul>
        </div>
      )}

      {lead.groundingMetadata && lead.groundingMetadata.groundingChunks && lead.groundingMetadata.groundingChunks.length > 0 && (
        <div className="p-5 sm:p-6 border-b border-slate-700">
          <h4 className="text-md font-semibold text-sky-300 mb-2 flex items-center">
            <SourceLinkIcon className="w-5 h-5 mr-2 text-slate-400" />
            Sources Found:
          </h4>
          <ul className="space-y-1 text-slate-400 text-xs pl-2">
            {lead.groundingMetadata.groundingChunks.map((chunk, index) => (
              chunk.web && (
                <li key={index} className="truncate">
                  <a 
                    href={chunk.web.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title={chunk.web.uri}
                    className="hover:text-sky-400 hover:underline"
                  >
                    {chunk.web.title || chunk.web.uri}
                  </a>
                </li>
              )
            ))}
          </ul>
        </div>
      )}

      {lead.emailSubject && lead.emailBody && (
        <div className="p-5 sm:p-6">
          <h4 className="text-md font-semibold text-sky-300 mb-3 flex items-center">
            <EmailIcon className="w-5 h-5 mr-2 text-teal-400" />
            Draft Email:
          </h4>
          <div className="bg-slate-700/50 p-4 rounded-md">
            <p className="text-sm font-medium text-slate-200 mb-1">Subject: {lead.emailSubject}</p>
            <p className="whitespace-pre-line text-sm text-slate-300 leading-relaxed">{lead.emailBody}</p>
          </div>
          <button
            onClick={handleCopyEmail}
            disabled={copied}
            className={`mt-4 w-full sm:w-auto flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
              copied
                ? 'bg-green-600 text-white focus:ring-green-500'
                : 'bg-sky-600 hover:bg-sky-500 text-white focus:ring-sky-500'
            } focus:outline-none focus:ring-2 focus:ring-opacity-75`}
          >
            {copied ? <CheckIcon className="w-5 h-5 mr-2" /> : <CopyIcon className="w-5 h-5 mr-2" />}
            {copied ? 'Email Copied!' : 'Copy Email to Clipboard'}
          </button>
        </div>
      )}
      
      {(lead.status === 'fetching_details' || lead.status === 'fetching_email') && (!lead.details || lead.details.length === 0) && (
        <div className="p-5 sm:p-6 text-center">
          <LoadingSpinner />
          <p className="mt-2 text-sm text-slate-400">
            {lead.status === 'fetching_details' ? 'Gathering insights from the web...' : 'Crafting email...'}
          </p>
        </div>
      )}
    </div>
  );
};