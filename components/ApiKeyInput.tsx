
import React, { useState } from 'react';
import { Button } from './Button';
import { KeyIcon, ErrorIcon } from './icons'; // Assuming KeyIcon is added to icons.tsx
import { LoadingSpinner } from './LoadingSpinner';


interface ApiKeyInputProps {
  onSubmit: (apiKey: string) => Promise<void>;
  error?: string | null;
  disabled: boolean;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onSubmit, error, disabled }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim() && !disabled) {
      onSubmit(apiKey.trim());
    }
  };

  return (
    <div className="p-6 sm:p-8 bg-slate-800 rounded-xl shadow-2xl max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center justify-center mb-4 text-sky-400">
          <KeyIcon className="w-10 h-10 mb-3" />
          <h2 className="text-2xl font-semibold text-center">Enter Your Gemini API Key</h2>
        </div>
        <p className="text-sm text-slate-400 text-center">
          To use the Gemini Cold Outreach Assistant, please provide your Google Gemini API key.
          You can obtain an API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">Google AI Studio</a>.
        </p>
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-sky-300 mb-1">
            Gemini API Key
          </label>
          <input
            id="apiKey"
            type="password" // Use password type for masking
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key here"
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none placeholder-slate-400 text-slate-100 transition-colors duration-150"
            disabled={disabled}
            aria-describedby={error ? "api-key-error-message" : undefined}
            aria-invalid={!!error}
          />
        </div>
        {error && (
            <div id="api-key-error-message" className="p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-md flex items-start space-x-2">
                <ErrorIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
            </div>
        )}
        <Button 
            type="submit" 
            disabled={disabled || !apiKey.trim()} 
            isLoading={disabled} // Show spinner when disabled (which means submitting)
            variant="primary" 
            className="w-full flex items-center justify-center"
        >
          {disabled ? 'Verifying Key...' : 'Submit Key & Start'}
        </Button>
      </form>
       <p className="text-xs text-slate-500 mt-6 text-center">
        Your API key is processed by your browser and sent directly to Google for API calls. It is not stored by this application beyond your current session.
      </p>
    </div>
  );
};
