
import React, { useState } from 'react';
import type { UserInput } from '../types';
import { Button } from './Button';
import { ArrowRightIcon } from './icons';

interface UserInputFormProps {
  onSubmit: (data: UserInput) => void;
  disabled: boolean;
}

export const UserInputForm: React.FC<UserInputFormProps> = ({ onSubmit, disabled }) => {
  const [serviceDescription, setServiceDescription] = useState('');
  const [targetArea, setTargetArea] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!serviceDescription.trim()) newErrors.serviceDescription = 'Service description is required.';
    else if (serviceDescription.trim().length < 10) newErrors.serviceDescription = 'Service description should be at least 10 characters.';
    
    if (!targetArea.trim()) newErrors.targetArea = 'Target area is required.';
    else if (targetArea.trim().length < 3) newErrors.targetArea = 'Target area should be at least 3 characters.';

    if (!targetAudience.trim()) newErrors.targetAudience = 'Target audience is required.';
    else if (targetAudience.trim().length < 5) newErrors.targetAudience = 'Target audience should be at least 5 characters.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ serviceDescription, targetArea, targetAudience });
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
          placeholder="e.g., AI-powered marketing analytics for e-commerce businesses"
          className={`${commonInputClass} min-h-[100px]`}
          rows={3}
          disabled={disabled}
        />
        {errors.serviceDescription && <p className={errorTextClass}>{errors.serviceDescription}</p>}
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
          disabled={disabled}
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
          disabled={disabled}
        />
        {errors.targetAudience && <p className={errorTextClass}>{errors.targetAudience}</p>}
      </div>
      <Button type="submit" disabled={disabled} variant="primary" className="w-full flex items-center justify-center">
        Start Research & Draft Emails
        <ArrowRightIcon className="ml-2 w-5 h-5" />
      </Button>
    </form>
  );
};
