
import React, { useState, useCallback, useEffect } from 'react';
import { UserInputForm } from './components/UserInputForm';
import { LeadsDisplay } from './components/LeadsDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ApiKeyInput } from './components/ApiKeyInput';
import { PastSearchesList } from './components/PastSearchesList'; // New component
import { Button } from './components/Button'; // For Dashboard
import { UserInput, ProcessedLead, AppPhase, SavedSearch } from './types';
import { initializeAI, clearAIInstance, fetchInitialLeads, fetchLeadDetails, fetchEmailDraft } from './services/geminiService';
import { ErrorIcon, InfoIcon, PlusCircleIcon } from './components/icons';
import { LOCAL_STORAGE_API_KEY, LOCAL_STORAGE_SAVED_SEARCHES } from './constants';

const App: React.FC = () => {
  const [userInput, setUserInput] = useState<UserInput | null>(null);
  const [leads, setLeads] = useState<ProcessedLead[]>([]);
  const [appPhase, setAppPhase] = useState<AppPhase>(AppPhase.AWAITING_API_KEY);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyValidated, setIsApiKeyValidated] = useState<boolean>(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [isSubmittingKey, setIsSubmittingKey] = useState(false);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);

  // Load API Key and Saved Searches from localStorage on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    if (storedApiKey) {
      setIsSubmittingKey(true);
      initializeAI(storedApiKey)
        .then(() => {
          setApiKey(storedApiKey);
          setIsApiKeyValidated(true);
          setAppPhase(AppPhase.DASHBOARD);
          setApiKeyError(null);
        })
        .catch((error) => {
          console.error("Failed to initialize with stored API key:", error);
          localStorage.removeItem(LOCAL_STORAGE_API_KEY);
          setAppPhase(AppPhase.AWAITING_API_KEY);
          setApiKeyError("Stored API key is invalid or expired. Please enter a new one.");
        })
        .finally(() => {
          setIsSubmittingKey(false);
        });
    } else {
      setAppPhase(AppPhase.AWAITING_API_KEY);
    }

    const rawSavedSearches = localStorage.getItem(LOCAL_STORAGE_SAVED_SEARCHES);
    if (rawSavedSearches) {
      try {
        setSavedSearches(JSON.parse(rawSavedSearches));
      } catch (e) {
        console.error("Failed to parse saved searches from localStorage:", e);
        localStorage.removeItem(LOCAL_STORAGE_SAVED_SEARCHES);
      }
    }
  }, []);

  const saveOrUpdateSearch = useCallback((currentInput: UserInput, currentLeads: ProcessedLead[], searchIdToUpdate?: string | null) => {
    setSavedSearches(prevSearches => {
      const idToUse = searchIdToUpdate || currentSearchId || crypto.randomUUID();
      
      const newSearchData: SavedSearch = {
        id: idToUse,
        timestamp: Date.now(),
        userInput: currentInput, // UserInput now includes serviceUrl
        leads: currentLeads, // ProcessedLead now includes groundingMetadata
        summary: `${currentInput.targetAudience.substring(0, 30)} in ${currentInput.targetArea.substring(0, 25)} for ${currentInput.serviceDescription.substring(0,20)}...`,
      };

      let updatedSearches;
      const existingIndex = prevSearches.findIndex(s => s.id === idToUse);
      if (existingIndex > -1) {
        updatedSearches = [...prevSearches];
        updatedSearches[existingIndex] = newSearchData;
      } else {
        updatedSearches = [newSearchData, ...prevSearches];
      }
      
      const MAX_SAVED_SEARCHES = 50;
      if (updatedSearches.length > MAX_SAVED_SEARCHES) {
        updatedSearches = updatedSearches.slice(0, MAX_SAVED_SEARCHES).sort((a,b) => b.timestamp - a.timestamp);
      } else {
        updatedSearches = updatedSearches.sort((a,b) => b.timestamp - a.timestamp);
      }

      localStorage.setItem(LOCAL_STORAGE_SAVED_SEARCHES, JSON.stringify(updatedSearches));
      if (!searchIdToUpdate && !currentSearchId && existingIndex === -1) {
          setCurrentSearchId(idToUse);
      }
      return updatedSearches;
    });
  }, [currentSearchId]);


  const updateLeadState = useCallback((id: string, updates: Partial<ProcessedLead>) => {
    setLeads(prevLeads => {
      const newLeads = prevLeads.map(lead => (lead.id === id ? { ...lead, ...updates } : lead));
      return newLeads;
    });
  }, []);

   useEffect(() => {
    if (currentSearchId && userInput && leads.length > 0 && (appPhase === AppPhase.PROCESSING_LEAD_ENRICHMENT || appPhase === AppPhase.RESULTS_DISPLAYED || appPhase === AppPhase.LOADING_INITIAL_LEADS)) {
      saveOrUpdateSearch(userInput, leads, currentSearchId);
    }
  }, [leads, currentSearchId, userInput, appPhase, saveOrUpdateSearch]);


  const handleApiKeySubmit = async (submittedKey: string) => {
    setIsSubmittingKey(true);
    setApiKeyError(null);
    setGlobalError(null);
    try {
      await initializeAI(submittedKey);
      setApiKey(submittedKey);
      localStorage.setItem(LOCAL_STORAGE_API_KEY, submittedKey);
      setIsApiKeyValidated(true);
      setAppPhase(AppPhase.DASHBOARD);
    } catch (error) {
      console.error("API Key submission/initialization error:", error);
      const message = error instanceof Error ? error.message : "Failed to initialize with API key.";
      setApiKeyError(message);
      setApiKey('');
      localStorage.removeItem(LOCAL_STORAGE_API_KEY);
      setIsApiKeyValidated(false);
      clearAIInstance();
      setAppPhase(AppPhase.AWAITING_API_KEY);
    } finally {
      setIsSubmittingKey(false);
    }
  };

  const processLeadEnrichment = useCallback(async (initialLeads: ProcessedLead[], currentInput: UserInput) => {
    setAppPhase(AppPhase.PROCESSING_LEAD_ENRICHMENT);

    for (const lead of initialLeads) {
      if (!isApiKeyValidated || appPhase === AppPhase.AWAITING_API_KEY) {
          setGlobalError(`API Key Error. Please re-enter your API key.`);
          setApiKey('');
          localStorage.removeItem(LOCAL_STORAGE_API_KEY);
          clearAIInstance();
          setIsApiKeyValidated(false);
          setAppPhase(AppPhase.AWAITING_API_KEY);
          return;
      }

      try {
        updateLeadState(lead.id, { status: 'fetching_details' });
        // fetchLeadDetails now returns an object with details and groundingMetadata
        const detailsData = await fetchLeadDetails(lead.name, currentInput); 
        updateLeadState(lead.id, { 
            details: detailsData.details, 
            contacts: detailsData.contacts, // Store contacts as well
            groundingMetadata: detailsData.groundingMetadata, // Store grounding metadata
            status: 'fetching_email' 
        });

        try {
          const emailData = await fetchEmailDraft(lead.name, detailsData.details, detailsData.contacts, currentInput); 
          updateLeadState(lead.id, {
            emailSubject: emailData.subject,
            emailBody: emailData.body,
            status: 'completed',
          });
        } catch (emailError) {
          console.error(`Error fetching email for ${lead.name}:`, emailError);
          const errorMessage = emailError instanceof Error ? emailError.message : 'Failed to generate email draft.';
          updateLeadState(lead.id, { status: 'error_email', errorMessage: errorMessage });
           if (errorMessage.toLowerCase().includes("api key") || errorMessage.includes("AI Service not initialized") || errorMessage.includes("authentication")) {
            setGlobalError(`API Key Error during email generation: ${errorMessage}. Please re-enter your API key.`);
            setApiKey('');
            localStorage.removeItem(LOCAL_STORAGE_API_KEY);
            clearAIInstance();
            setIsApiKeyValidated(false);
            setAppPhase(AppPhase.AWAITING_API_KEY);
            return;
          }
        }
      } catch (detailsError) {
        console.error(`Error fetching details for ${lead.name}:`, detailsError);
         const errorMessage = detailsError instanceof Error ? detailsError.message : 'Failed to fetch lead details.';
        updateLeadState(lead.id, { status: 'error_details', errorMessage: errorMessage });
        if (errorMessage.toLowerCase().includes("api key") || errorMessage.includes("AI Service not initialized") || errorMessage.includes("authentication")) {
            setGlobalError(`API Key Error during detail fetching: ${errorMessage}. Please re-enter your API key.`);
            setApiKey('');
            localStorage.removeItem(LOCAL_STORAGE_API_KEY);
            clearAIInstance();
            setIsApiKeyValidated(false);
            setAppPhase(AppPhase.AWAITING_API_KEY);
            return;
        }
      }
    }
    if (appPhase !== AppPhase.AWAITING_API_KEY) {
        setAppPhase(AppPhase.RESULTS_DISPLAYED);
    }
  }, [updateLeadState, appPhase, isApiKeyValidated]);

  const handleFormSubmit = useCallback(async (data: UserInput) => {
    setUserInput(data); 
    setLeads([]);
    setGlobalError(null);
    setApiKeyError(null);
    setCurrentSearchId(null); 
    setAppPhase(AppPhase.LOADING_INITIAL_LEADS);

    try {
      const initialLeadNames = await fetchInitialLeads(data); 
      const initialLeadsData: ProcessedLead[] = initialLeadNames.map(rawLead => ({
        id: crypto.randomUUID(),
        name: rawLead.name,
        status: 'initial',
        // groundingMetadata will be added during enrichment phase for each lead
      }));
      setLeads(initialLeadsData); 
      
      const newGeneratedId = crypto.randomUUID();
      setCurrentSearchId(newGeneratedId); 
      saveOrUpdateSearch(data, initialLeadsData, newGeneratedId);


      if (initialLeadsData.length > 0) {
        await processLeadEnrichment(initialLeadsData, data);
      } else {
        setGlobalError("No potential leads were generated. Try broadening your criteria. (Note: Search grounding is active, results depend on real web data).");
        setAppPhase(AppPhase.DASHBOARD); 
      }
    } catch (error) {
      console.error('Error fetching initial leads:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while fetching leads.';
      if (errorMessage.toLowerCase().includes("api key") || errorMessage.includes("AI Service not initialized") || errorMessage.includes("authentication")) {
        setGlobalError(`API Key Error: ${errorMessage}. Please re-enter your API key.`);
        setApiKey('');
        localStorage.removeItem(LOCAL_STORAGE_API_KEY);
        clearAIInstance();
        setIsApiKeyValidated(false);
        setAppPhase(AppPhase.AWAITING_API_KEY);
      } else {
        setGlobalError(`Failed to fetch initial leads: ${errorMessage}`);
        setAppPhase(AppPhase.IDLE); 
      }
    }
  }, [processLeadEnrichment, saveOrUpdateSearch]);

  const handleResetToDashboard = () => { 
    setUserInput(null);
    setLeads([]);
    setGlobalError(null);
    setCurrentSearchId(null);
    if (isApiKeyValidated) {
      setAppPhase(AppPhase.DASHBOARD);
    } else {
      setAppPhase(AppPhase.AWAITING_API_KEY);
    }
  };

  const handleChangeApiKey = () => {
    setApiKey('');
    localStorage.removeItem(LOCAL_STORAGE_API_KEY);
    clearAIInstance();
    setIsApiKeyValidated(false);
    setAppPhase(AppPhase.AWAITING_API_KEY);
    setUserInput(null);
    setLeads([]);
    setGlobalError(null);
    setApiKeyError(null);
    setCurrentSearchId(null);
  };

  const handleLoadSearch = (searchId: string) => {
    const searchToLoad = savedSearches.find(s => s.id === searchId);
    if (searchToLoad) {
      setUserInput(searchToLoad.userInput); 
      setLeads(searchToLoad.leads); // Leads will now include groundingMetadata
      setCurrentSearchId(searchToLoad.id);
      const isFullyProcessed = searchToLoad.leads.every(l => l.status === 'completed' || l.status.startsWith('error_'));
      setAppPhase(isFullyProcessed ? AppPhase.RESULTS_DISPLAYED : AppPhase.PROCESSING_LEAD_ENRICHMENT);
      
      if (searchToLoad.leads.some(l => l.status === 'fetching_details' || l.status === 'fetching_email' || l.status === 'initial')) {
         setAppPhase(AppPhase.RESULTS_DISPLAYED); 
      } else {
         setAppPhase(AppPhase.RESULTS_DISPLAYED);
      }
      setGlobalError(null);
      setApiKeyError(null);
    }
  };

  const handleDeleteSearch = (searchIdToDelete: string) => {
    setSavedSearches(prevSearches => {
      const updatedSearches = prevSearches.filter(s => s.id !== searchIdToDelete);
      localStorage.setItem(LOCAL_STORAGE_SAVED_SEARCHES, JSON.stringify(updatedSearches));
      return updatedSearches;
    });
    if (currentSearchId === searchIdToDelete) {
      handleResetToDashboard(); 
    }
  };
  
  const renderContent = () => {
    if (!isApiKeyValidated && appPhase !== AppPhase.AWAITING_API_KEY && !isSubmittingKey) {
      handleChangeApiKey(); 
      return <ApiKeyInput onSubmit={handleApiKeySubmit} error={"API key became invalid. Please re-enter."} disabled={isSubmittingKey} />;
    }

    switch (appPhase) {
      case AppPhase.AWAITING_API_KEY:
        const errorForApiKeyScreen = apiKeyError || (globalError && (globalError.toLowerCase().includes("api key") || globalError.toLowerCase().includes("authentication")) ? globalError : null);
        return <ApiKeyInput onSubmit={handleApiKeySubmit} error={errorForApiKeyScreen} disabled={isSubmittingKey} />;
      
      case AppPhase.DASHBOARD:
        return (
          <div className="animate-fadeIn">
            <div className="mb-10 text-center">
              <Button 
                variant="primary" 
                onClick={() => { setCurrentSearchId(null); setUserInput(null); setLeads([]); setAppPhase(AppPhase.IDLE);}}
                className="px-10 py-4 text-lg"
              >
                <PlusCircleIcon className="w-6 h-6 mr-3" />
                Start New Research Project
              </Button>
            </div>
            <PastSearchesList searches={savedSearches} onLoadSearch={handleLoadSearch} onDeleteSearch={handleDeleteSearch} />
          </div>
        );

      case AppPhase.IDLE:
        return (
           <div className="animate-fadeIn">
            {appPhase === AppPhase.IDLE && !globalError && (
              <div className="mb-8 p-6 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 text-sky-300 rounded-xl flex items-start space-x-4 shadow-lg">
                <InfoIcon className="w-7 h-7 text-sky-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-sky-200 text-lg">New Research Project</h3>
                  <p className="text-slate-300">GEMCOA will use Google Search to find real companies and information. Provide details about your service (you can also include a URL and upload a document), target area, and audience. GEMCOA will help generate potential leads, gather insights, and draft personalized outreach emails.</p>
                </div>
              </div>
            )}
            <UserInputForm onSubmit={handleFormSubmit} disabled={false} />
             <Button onClick={handleResetToDashboard} variant="secondary" className="mt-8 mx-auto block">
                Back to Dashboard
            </Button>
          </div>
        );
      case AppPhase.FATAL_ERROR:
         return ( 
            <div className="text-center p-8 sm:p-12 bg-red-900/50 backdrop-blur-md border border-red-700/50 rounded-xl shadow-2xl animate-fadeIn max-w-lg mx-auto">
              <div className="flex justify-center mb-6"> <ErrorIcon className="w-16 h-16 text-red-400" /> </div>
              <h2 className="text-3xl font-semibold text-red-300 mb-3">Application Error</h2>
              <p className="text-red-200 text-lg mb-8">{globalError}</p>
              <Button
                onClick={handleChangeApiKey} 
                variant="danger"
                className="px-8 py-3 text-base"
              > Reset and Enter API Key </Button>
            </div>
          );
      case AppPhase.LOADING_INITIAL_LEADS:
        return ( 
          <div className="text-center p-10 animate-fadeIn flex flex-col items-center justify-center min-h-[300px]">
            <LoadingSpinner size="lg" color="text-sky-400" /> 
            <p className="mt-6 text-2xl font-semibold text-sky-300">Searching the web for initial leads...</p>
            <p className="text-slate-400">Gemini is using Google Search to find real businesses. This may take a few moments.</p>
            {userInput && <p className="text-sm text-slate-500 mt-3">For: {userInput.targetAudience} in {userInput.targetArea}</p>}
          </div>
        );
      case AppPhase.PROCESSING_LEAD_ENRICHMENT:
      case AppPhase.RESULTS_DISPLAYED:
        return ( 
          <div className="animate-fadeIn">
            {userInput && (
              <div className="mb-10 p-6 sm:p-8 bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-xl">
                <h2 className="text-3xl font-bold text-sky-400 mb-4">Research: <span className="text-sky-300">{userInput.targetAudience}</span> in <span className="text-sky-300">{userInput.targetArea}</span></h2>
                <div className="text-slate-300 text-lg space-y-2">
                    <p><strong className="font-medium text-sky-300/80">Your Service Description:</strong> {userInput.serviceDescription}</p>
                    {userInput.serviceUrl && <p><strong className="font-medium text-sky-300/80">Your Business URL:</strong> <a href={userInput.serviceUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">{userInput.serviceUrl}</a></p>}
                </div>

                {appPhase === AppPhase.PROCESSING_LEAD_ENRICHMENT && (
                   <div className="mt-5 flex items-center text-amber-400">
                     <LoadingSpinner size="sm" color="text-amber-400"/>  
                     <span className="ml-3 text-lg">Searching for details & drafting emails...</span>
                   </div>
                )}
              </div>
            )}
            <LeadsDisplay leads={leads} />
            { (appPhase === AppPhase.RESULTS_DISPLAYED || appPhase === AppPhase.PROCESSING_LEAD_ENRICHMENT) && (
                 <div className="mt-12 text-center">
                    <Button
                        onClick={handleResetToDashboard}
                        variant="primary"
                        className="px-10 py-4 text-lg"
                    >
                        Back to Dashboard / Start New
                    </Button>
                 </div>
            )}
          </div>
        );
      default:
        setAppPhase(AppPhase.AWAITING_API_KEY); 
        return <ApiKeyInput onSubmit={handleApiKeySubmit} error={apiKeyError} disabled={isSubmittingKey}/>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 md:p-8 selection:bg-sky-500 selection:text-white relative overflow-hidden">
      {/* Subtle gradient background for the page */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-black bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px]"></div>

      <div className="w-full max-w-5xl z-10"> 
        <Header />
        <main className="mt-10 sm:mt-12">
          {globalError && appPhase !== AppPhase.AWAITING_API_KEY && appPhase !== AppPhase.FATAL_ERROR && (
            <div className="mb-8 p-5 bg-red-900/60 backdrop-blur-sm border border-red-700/60 text-red-200 rounded-xl flex items-start space-x-3 animate-fadeIn shadow-lg">
              <ErrorIcon className="w-6 h-6 text-red-300 flex-shrink-0 mt-1" />
              <div> <h3 className="font-semibold text-red-100 text-lg">Error Occurred</h3> <p>{globalError}</p> </div>
            </div>
          )}
          {renderContent()}
        </main>
        <Footer onChangeApiKey={isApiKeyValidated ? handleChangeApiKey : undefined} />
      </div>
    </div>
  );
};

export default App;
