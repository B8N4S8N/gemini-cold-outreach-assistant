
import React, { useState, useRef } from 'react';
import type { UserInput } from '../types';
import { Button } from './Button';
import { ArrowRightIcon, LinkIcon, UploadIcon, XCircleIcon } from './icons';

interface UserInputFormProps {
  onSubmit: (data: UserInput) => void;
  disabled: boolean;
}

export const UserInputForm: React.FC<UserInputFormProps> = ({ onSubmit, disabled }) => {
  const [serviceDescription, setServiceDescription] = useState('');
  const [targetArea, setTargetArea] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [serviceUrl, setServiceUrl] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!serviceDescription.trim()) newErrors.serviceDescription = 'Service description is required.';
    else if (serviceDescription.trim().length < 10) newErrors.serviceDescription = 'Service description should be at least 10 characters.';
    
    if (!targetArea.trim()) newErrors.targetArea = 'Target area is required.';
    else if (targetArea.trim().length < 3) newErrors.targetArea = 'Target area should be at least 3 characters.';

    if (!targetAudience.trim()) newErrors.targetAudience = 'Target audience is required.';
    else if (targetAudience.trim().length < 5) newErrors.targetAudience = 'Target audience should be at least 5 characters.';

    if (serviceUrl.trim() && !serviceUrl.match(/^(ftp|http|https):\/\/[^ "]+$/)) {
      newErrors.serviceUrl = 'Please enter a valid URL (e.g., https://example.com).';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileError(null);
      setIsFileLoading(true);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setServiceDescription(prev => `${prev}\n\n--- Content from ${file.name} ---\n${content}`.trim());
        setIsFileLoading(false);
      };
      reader.onerror = () => {
        setFileError(`Error reading file: ${file.name}`);
        setFileName(null);
        setIsFileLoading(false);
      };
      
      if (file.type === "text/plain" || file.type === "text/markdown") {
        reader.readAsText(file);
      } else {
        setFileError("Unsupported file type. Please upload .txt or .md files.");
        setFileName(null);
        setIsFileLoading(false);
        if(fileInputRef.current) fileInputRef.current.value = ""; // Clear the input
      }
    }
  };

  const handleRemoveFile = () => {
    setServiceDescription(prev => {
      const parts = prev.split(`\n\n--- Content from ${fileName} ---`);
      return parts[0].trim(); // Keep only the part before the appended file content
    });
    setFileName(null);
    setFileError(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ serviceDescription, targetArea, targetAudience, serviceUrl });
    }
  };

  const commonInputClass = "w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none placeholder-slate-400 text-slate-100 transition-colors duration-150";
  const errorTextClass = "text-red-400 text-sm mt-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8 bg-slate-800 rounded-xl shadow-2xl">
      <div>
        <label htmlFor="serviceDescription" className="block text-sm font-medium text-sky-300 mb-1">
          Your Service/Business Offering
        </label>
        <textarea
          id="serviceDescription"
          value={serviceDescription}
          onChange={(e) => setServiceDescription(e.target.value)}
          placeholder="e.g., AI-powered marketing analytics for e-commerce businesses. You can also upload a .txt or .md file below to append its content."
          className={`${commonInputClass} min-h-[120px]`}
          rows={4}
          disabled={disabled || isFileLoading}
        />
        {errors.serviceDescription && <p className={errorTextClass}>{errors.serviceDescription}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label htmlFor="serviceUrl" className="block text-sm font-medium text-sky-300 mb-1">
            Business URL (Optional)
            </label>
            <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="w-5 h-5 text-slate-400" />
            </span>
            <input
                id="serviceUrl"
                type="url"
                value={serviceUrl}
                onChange={(e) => setServiceUrl(e.target.value)}
                placeholder="https://yourbusiness.com"
                className={`${commonInputClass} pl-10`}
                disabled={disabled}
            />
            </div>
            {errors.serviceUrl && <p className={errorTextClass}>{errors.serviceUrl}</p>}
        </div>
        <div>
            <label htmlFor="fileUpload" className="block text-sm font-medium text-sky-300 mb-1">
            Upload Service Document (Optional, .txt, .md)
            </label>
            <div className="relative">
              <input
                id="fileUpload"
                type="file"
                ref={fileInputRef}
                accept=".txt,.md,text/plain,text/markdown"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={disabled || isFileLoading}
              />
              <div className={`${commonInputClass} flex items-center justify-between cursor-pointer ${isFileLoading ? 'bg-slate-600' : ''}`}>
                <span className="flex items-center text-slate-400">
                  <UploadIcon className="w-5 h-5 mr-2" />
                  {isFileLoading ? 'Reading file...' : (fileName || 'Choose a file...')}
                </span>
                {fileName && !isFileLoading && (
                  <button 
                    type="button" 
                    onClick={handleRemoveFile} 
                    className="text-slate-400 hover:text-red-400"
                    aria-label="Remove uploaded file"
                    disabled={disabled}
                  >
                    <XCircleIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            {fileError && <p className={errorTextClass}>{fileError}</p>}
            {fileName && !isFileLoading && <p className="text-xs text-slate-400 mt-1">Content from "{fileName}" has been appended to the description above.</p>}
        </div>
      </div>


      <div>
        <label htmlFor="targetArea" className="block text-sm font-medium text-sky-300 mb-1">
          Target Geographic Area
        </label>
        <input
          id="targetArea"
          type="text"
          value={targetArea}
          onChange={(e) => setTargetArea(e.target.value)}
          placeholder="e.g., San Francisco Bay Area, London, Remote (Global)"
          className={commonInputClass}
          disabled={disabled || isFileLoading}
        />
        {errors.targetArea && <p className={errorTextClass}>{errors.targetArea}</p>}
      </div>
      <div>
        <label htmlFor="targetAudience" className="block text-sm font-medium text-sky-300 mb-1">
          Target Audience / Company Type
        </label>
        <input
          id="targetAudience"
          type="text"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="e.g., SaaS startups with 10-50 employees, Local restaurants, Independent financial advisors"
          className={commonInputClass}
          disabled={disabled || isFileLoading}
        />
        {errors.targetAudience && <p className={errorTextClass}>{errors.targetAudience}</p>}
      </div>
      <Button type="submit" disabled={disabled || isFileLoading} variant="primary" className="w-full flex items-center justify-center">
        {isFileLoading ? 'Processing file...' : 'Start Research & Draft Emails'}
        {!isFileLoading && <ArrowRightIcon className="ml-2 w-5 h-5" />}
      </Button>
    </form>
  );
};
