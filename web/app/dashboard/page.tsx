'use client'

import React, { useEffect, useState } from 'react';
import { useAuth, SignedIn, useUser } from '@clerk/nextjs'; // Combined Clerk imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator"
import { 
  Settings,
  Zap,
  Clock,
  FileText,
  TrendingUp,
  Users,
  Star
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from 'next/link';
import { Skeleton } from "@/components/ui/skeleton"; // For loading states
import { Progress } from "@/components/ui/progress"; // Added for the Progress component

// Chart components (assuming these are correctly set up for usage display)
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

interface HistoryItem {
  id: string;
  userId?: string;
  url?: string;
  title?: string;
  tldr: string;
  keyPoints?: string[];
  createdAt: string;
  // Extension format compatibility
  timestamp?: string;
  summary?: string;
  key_points?: string[];
}

interface UserAccountDetails {
  email: string | null;
  plan: string;
  summariesUsed: number;
  summaryLimit: number;
  is_pro: boolean;
}

const chartConfig = {
  used: { label: "Used", color: "hsl(var(--chart-1))" },
  limit: { label: "Limit", color: "hsl(var(--muted))" }, // Muted for background bar
} satisfies ChartConfig;

// Helper function to communicate with Chrome extension
const getExtensionHistory = (): Promise<HistoryItem[]> => {
  return new Promise((resolve) => {
    // Try to get history via postMessage to the page (if extension injects a script)
    if (typeof window !== 'undefined') {
      // Create a custom event to request history from extension
      const historyRequestEvent = new CustomEvent('tildra-request-history', {
        detail: { action: 'getHistory' }
      });
      
      // Listen for the response
      const historyResponseHandler = (event: CustomEvent) => {
        if (event.type === 'tildra-history-response') {
          window.removeEventListener('tildra-history-response', historyResponseHandler as EventListener);
          const history = event.detail?.history || [];
          const convertedHistory = history.map((item: any) => ({
            id: item.id,
            title: item.title,
            url: item.url,
            tldr: item.summary || item.tldr,
            keyPoints: item.keyPoints || item.key_points || [],
            createdAt: item.timestamp || item.createdAt,
          }));
          resolve(convertedHistory);
        }
      };
      
      window.addEventListener('tildra-history-response', historyResponseHandler as EventListener);
      
      // Dispatch the request
      window.dispatchEvent(historyRequestEvent);
      
      // Timeout after 2 seconds if no response
      setTimeout(() => {
        window.removeEventListener('tildra-history-response', historyResponseHandler as EventListener);
        resolve([]);
      }, 2000);
    } else {
      resolve([]);
    }
  });
};

// Alternative: Try to access Chrome storage directly (may not work due to permissions)
const getExtensionStorageDirectly = (): Promise<HistoryItem[]> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.chrome && window.chrome.storage) {
      try {
        window.chrome.storage.local.get(['summaryHistory'], (result) => {
          if (chrome.runtime.lastError) {
            console.log('Cannot access extension storage directly');
            resolve([]);
          } else {
            const history = result.summaryHistory || [];
            // Convert extension format to dashboard format
            const convertedHistory = history.map((item: any) => ({
              id: item.id,
              title: item.title,
              url: item.url,
              tldr: item.summary || item.tldr,
              keyPoints: item.keyPoints || item.key_points || [],
              createdAt: item.timestamp || item.createdAt,
            }));
            resolve(convertedHistory);
          }
        });
      } catch (error) {
        console.log('Error accessing extension storage:', error);
        resolve([]);
      }
    } else {
      resolve([]);
    }
  });
};

// Helper function to delete from extension storage
const deleteFromExtensionStorage = (summaryId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined') {
      // Create delete request event
      const deleteRequestEvent = new CustomEvent('tildra-delete-summary', {
        detail: { summaryId: summaryId }
      });
      
      // Listen for the response
      const deleteResponseHandler = (event: CustomEvent) => {
        if (event.type === 'tildra-delete-response' && event.detail?.summaryId === summaryId) {
          window.removeEventListener('tildra-delete-response', deleteResponseHandler as EventListener);
          resolve(event.detail?.success || false);
        }
      };
      
      window.addEventListener('tildra-delete-response', deleteResponseHandler as EventListener);
      
      // Dispatch the request
      window.dispatchEvent(deleteRequestEvent);
      
      // Timeout after 3 seconds if no response
      setTimeout(() => {
        window.removeEventListener('tildra-delete-response', deleteResponseHandler as EventListener);
        resolve(false);
      }, 3000);
    } else {
      resolve(false);
    }
  });
};

// Helper function to clear all from extension storage
const clearAllFromExtensionStorage = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined') {
      // Create clear all request event
      const clearAllRequestEvent = new CustomEvent('tildra-clear-all-history', {
        detail: { action: 'clearAll' }
      });
      
      // Listen for the response
      const clearAllResponseHandler = (event: CustomEvent) => {
        if (event.type === 'tildra-clear-all-response') {
          window.removeEventListener('tildra-clear-all-response', clearAllResponseHandler as EventListener);
          resolve(event.detail?.success || false);
        }
      };
      
      window.addEventListener('tildra-clear-all-response', clearAllResponseHandler as EventListener);
      
      // Dispatch the request
      window.dispatchEvent(clearAllRequestEvent);
      
      // Timeout after 3 seconds if no response
      setTimeout(() => {
        window.removeEventListener('tildra-clear-all-response', clearAllResponseHandler as EventListener);
        resolve(false);
      }, 3000);
    } else {
      resolve(false);
    }
  });
};

export default function DashboardPage() {
  const { getToken } = useAuth();
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [accountDetails, setAccountDetails] = useState<UserAccountDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<HistoryItem | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!isSignedIn) {
        setIsLoading(false); // Not signed in, nothing to load
        return;
      }
      setIsLoading(true);
      setError(null);
      console.log("[Dashboard] fetchData initiated. isSignedIn:", isSignedIn);
      try {
        const token = await getToken();
        if (!token) throw new Error('Authentication token not available.');
        console.log("[Dashboard] Auth token retrieved.");

        const headers = { Authorization: `Bearer ${token}` };
        let fetchedBackendHistory: HistoryItem[] = [];
        let fetchedExtensionHistory: HistoryItem[] = [];

        // 1. Fetch history from backend database (Primary Source)
        try {
          console.log("[Dashboard] Fetching backend history from /api/history...");
          const historyRes = await fetch(`/api/history`, { headers, cache: 'no-store' });
          console.log("[Dashboard] Backend history response status:", historyRes.status);

          if (historyRes.ok) {
            const backendHistoryData = await historyRes.json();
            console.log('[Dashboard] Raw backend history response JSON:', JSON.parse(JSON.stringify(backendHistoryData)));
            fetchedBackendHistory = backendHistoryData.map((item: any) => ({
              id: item.id,
              userId: item.userId,
              url: item.url,
              title: item.title,
              tldr: item.tldr,
              keyPoints: item.keyPoints || [],
              createdAt: item.createdAt,
            }));
            console.log('[Dashboard] Converted backend history:', JSON.parse(JSON.stringify(fetchedBackendHistory)));
          } else {
            console.warn('Failed to fetch backend history:', historyRes.status, historyRes.statusText);
            const errorText = await historyRes.text();
            console.warn('Backend history error response body:', errorText);
            // Potentially set an error state here if backend history is crucial and fails
            setError("Failed to load summary history from server.");
          }
        } catch (backendError) {
          console.error('Error fetching or processing backend history:', backendError);
          setError("Error fetching summary history.");
        }

        // 2. Attempt to get history from Chrome extension (Secondary Source / Fallback)
        // This can be useful if there are summaries not yet synced to backend
        if (typeof window !== 'undefined') { // Ensure this runs only on client-side
            try {
              console.log("[Dashboard] Attempting to get extension history (direct then message)...");
              let extensionHistory = await getExtensionStorageDirectly();
              if (extensionHistory.length === 0) {
                extensionHistory = await getExtensionHistory();
              }
              console.log('[Dashboard] Extension history fetched:', JSON.parse(JSON.stringify(extensionHistory)));
              fetchedExtensionHistory = extensionHistory.map((item: any) => ({ // Ensure consistent mapping
                id: item.id, // Extension might have its own ID format
                title: item.title,
                url: item.url,
                tldr: item.summary || item.tldr,
                keyPoints: item.keyPoints || item.key_points || [],
                createdAt: item.timestamp || item.createdAt,
              }));
            } catch (extError) {
              console.warn('Extension storage not available or error fetching from it:', extError);
            }
        }
        
        // 3. Merge and de-duplicate histories
        // Prioritize backend data. Use a Map to handle de-duplication based on 'id' from backend,
        // or a combination of url/title/timestamp for extension items if they don't have a backend ID.
        const combinedHistoryMap = new Map<string, HistoryItem>();

        // Add backend history first (these are considered canonical)
        fetchedBackendHistory.forEach(item => combinedHistoryMap.set(item.id, item));

        // Add extension history, avoiding duplicates of what's already from backend
        // A more robust de-duplication might be needed if extension items can exist without a backend ID
        // but represent the same summary. For now, we assume backend IDs are authoritative.
        fetchedExtensionHistory.forEach(extItem => {
          // A simple check: if an item with a similar URL and creation time (within a window)
          // already exists from the backend, we might skip the extension one, or mark it.
          // For now, if the extension item has an ID that matches a backend ID, it's already handled.
          // If it has a different ID (or no ID that matches backend), add it.
          // This part needs careful consideration based on how extension IDs relate to backend IDs.
          // Let's assume for now that extension items might not have a backend-synced `id` field that matches.
          // We can use a composite key for extension items if they lack a backend ID.
          const extKey = `ext-${extItem.url}-${new Date(extItem.createdAt).getTime()}`;
          let isLikelyDuplicate = false;
          if (extItem.url && extItem.createdAt) {
            for (const backendItem of fetchedBackendHistory) {
              if (backendItem.url === extItem.url && 
                  Math.abs(new Date(backendItem.createdAt).getTime() - new Date(extItem.createdAt).getTime()) < 60000 * 5 // 5 min window
              ) {
                isLikelyDuplicate = true;
                break;
              }
            }
          }

          if (!isLikelyDuplicate && !combinedHistoryMap.has(extItem.id)) { // if extItem.id is not a backend id
             // If extItem.id is unique (i.e. not from backend), or if we decide to add it based on other criteria
             // For simplicity, we check if an item with this extension ID is already there.
             // This assumes extension IDs are somewhat stable for items not yet in backend.
            if(!combinedHistoryMap.has(extItem.id)) { // Check if this specific extension ID is already added
                 combinedHistoryMap.set(extItem.id || extKey, extItem); // Use extKey if id is not reliable
            }
          } else if (isLikelyDuplicate) {
            console.log("[Dashboard] Skipped likely duplicate extension item:", extItem.title);
          }
        });

        let finalHistory = Array.from(combinedHistoryMap.values());
        
        // Sort by creation date (newest first)
        finalHistory.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.timestamp || 0).getTime();
          const dateB = new Date(b.createdAt || b.timestamp || 0).getTime();
          return dateB - dateA;
        });
            
        console.log('[Dashboard] Final combined, de-duplicated, and sorted history:', JSON.parse(JSON.stringify(finalHistory)));
        setHistory(finalHistory);

        // Fetch account details from the backend
        console.log("[Dashboard] Fetching account details...");
        try {
          const accountRes = await fetch(`/api/user/account-details`, { headers });
          if (!accountRes.ok) throw new Error(`Failed to fetch account details: ${accountRes.statusText} (${accountRes.status})`);
          const accountData = await accountRes.json();
          setAccountDetails(accountData);
        } catch (accountError) {
          console.error("Failed to fetch account details:", accountError);
          // Set fallback account details so dashboard still works
          setAccountDetails({
            email: user?.emailAddresses?.[0]?.emailAddress || 'user@example.com',
            plan: 'Free',
            summariesUsed: 0,
            summaryLimit: 10,
            is_pro: false
          });
        }

      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('An unknown error occurred');
        console.error("Fetch error in dashboard:", err);
      }
      setIsLoading(false);
    };

    if (isUserLoaded) { // Only fetch data once Clerk user state is loaded
        fetchData();
    }
  }, [getToken, isSignedIn, isUserLoaded]);

  const handleViewSummary = (summary: HistoryItem) => {
    setSelectedSummary(summary);
    setIsSummaryModalOpen(true);
  };

  const handleDeleteSummary = async (summaryId: string) => {
    if (!confirm('Are you sure you want to delete this summary?')) return;
    setError(null); // Clear previous errors
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");
      const headers = { Authorization: `Bearer ${token}` };
      
      let backendDeleteSuccess = false;
      let extensionDeleteSuccess = false;

      // Attempt to delete from backend
      const backendRes = await fetch(`/api/history/${summaryId}`, { method: 'DELETE', headers });
      if (backendRes.ok) {
        console.log(`[Dashboard] Summary ${summaryId} deleted from backend.`);
        backendDeleteSuccess = true;
      } else {
        const errorText = await backendRes.text();
        console.error(`[Dashboard] Failed to delete summary ${summaryId} from backend:`, backendRes.status, errorText);
        // Do not throw error yet, try deleting from extension if applicable
      }
      
      // Attempt to delete from extension storage if applicable
      // Check if this summaryId might have come from extension or if it's a backend-only ID
      const summaryToDelete = history.find(s => s.id === summaryId);
      // A more robust check might be needed if IDs are not universally unique
      // For now, we assume deleteFromExtensionStorage can handle non-existent IDs gracefully.
      if (typeof window !== 'undefined') {
        console.log(`[Dashboard] Attempting to delete summary ${summaryId} from extension.`);
        extensionDeleteSuccess = await deleteFromExtensionStorage(summaryId);
        if (extensionDeleteSuccess) {
          console.log(`[Dashboard] Summary ${summaryId} reported as deleted from extension.`);
        } else {
          console.warn(`[Dashboard] Summary ${summaryId} not deleted from extension (or not found).`);
        }
      }
      
      if (backendDeleteSuccess || extensionDeleteSuccess) {
        setHistory(prevHistory => prevHistory.filter(item => item.id !== summaryId));
        console.log(`[Dashboard] Summary ${summaryId} removed from UI history state.`);
      } else {
        // If neither deletion was successful (and backend failed specifically)
        const errorMsg = `Failed to delete summary. Backend status: ${backendRes.status}. Extension delete: ${extensionDeleteSuccess}.`;
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while deleting.';
      setError(errorMessage);
      console.error("[Dashboard] handleDeleteSummary error:", err);
    }
  };

  const handleClearAllSummaries = async () => {
    if (!confirm('Are you sure you want to delete ALL your summaries? This action cannot be undone.')) return;
    setError(null); // Clear previous errors
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");
      const headers = { Authorization: `Bearer ${token}` };
      
      let backendClearSuccess = false;
      let extensionClearSuccess = false;

      // Attempt to clear from backend
      const backendRes = await fetch(`/api/history`, { method: 'DELETE', headers });
      if (backendRes.ok) {
        console.log("[Dashboard] All summaries cleared from backend.");
        backendClearSuccess = true;
      } else {
        const errorText = await backendRes.text();
        console.error('[Dashboard] Failed to clear all summaries from backend:', backendRes.status, errorText);
        // Do not throw error yet
      }
      
      // Attempt to clear from extension storage
      if (typeof window !== 'undefined') {
        console.log("[Dashboard] Attempting to clear all summaries from extension.");
        extensionClearSuccess = await clearAllFromExtensionStorage();
        if (extensionClearSuccess) {
          console.log("[Dashboard] All summaries reported as cleared from extension.");
        } else {
          console.warn("[Dashboard] Failed to clear all summaries from extension (or no action taken).");
        }
      }
      
      if (backendClearSuccess || extensionClearSuccess) { // If at least one source confirmed clearance
        setHistory([]);
        console.log("[Dashboard] History state cleared in UI.");
      } else {
        const errorMsg = `Failed to clear all summaries. Backend status: ${backendRes.status}. Extension clear: ${extensionClearSuccess}.`;
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while clearing history.';
      setError(errorMessage);
      console.error("[Dashboard] handleClearAllSummaries error:", err);
    }
  };

  const usageChartData = accountDetails ? [
    { 
      label: "Usage", 
      used: accountDetails.summariesUsed, 
      limit: accountDetails.summaryLimit
    }
  ] : [];
  
  const usagePercentage = accountDetails && accountDetails.summaryLimit > 0 
    ? Math.round((accountDetails.summariesUsed / accountDetails.summaryLimit) * 100) 
    : 0;

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    }
  };

  if (!isUserLoaded || isLoading) return (
    <div className="container max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all">
              <CardHeader><Skeleton className="h-7 w-40"/></CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-5 w-56"/>
                <Skeleton className="h-6 w-32"/>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all">
              <CardHeader><Skeleton className="h-7 w-40"/></CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-5 w-56"/>
                <Skeleton className="h-8 w-full"/>
              </CardContent>
            </Card>
        </div>
        <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all">
          <CardHeader><Skeleton className="h-7 w-52"/></CardHeader>
          <CardContent><Skeleton className="h-48 w-full"/></CardContent>
        </Card>
    </div>
  );
  
  if (error && !isLoading) return (
     <div className="container max-w-7xl mx-auto p-6 text-center">
       <Card className="border-border/40 bg-destructive/5 p-6">
         <CardContent className="space-y-3 pt-4">
           <div className="text-destructive font-semibold">Error: {error}</div>
           <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
             Try Again
           </Button>
         </CardContent>
       </Card>
     </div>
  );

  if (!isSignedIn) return (
    <div className="container max-w-7xl mx-auto p-6 text-center">
      <Card className="border-border/40 bg-muted/50 p-6">
        <CardContent className="space-y-3 pt-4">
          <p className="text-lg">Please sign in to view your dashboard.</p>
          <Link href="/sign-in">
            <Button variant="default" className="mt-2">Sign In</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );

  if (!accountDetails) return (
    <div className="container max-w-7xl mx-auto p-6 text-center">
      <Card className="border-border/40 bg-muted/50 p-6">
        <CardContent className="space-y-3 pt-4">
          <p className="text-lg">Could not load account details.</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const { email, plan, summariesUsed, summaryLimit, is_pro } = accountDetails;

  return (
    <SignedIn> {/* Ensure UI is only rendered for signed-in users */}
      <div className="container max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2 border-b border-border/10">
              <CardTitle className="text-xl">Account Info</CardTitle>
              <CardDescription className="text-xs opacity-70">{user?.primaryEmailAddress?.emailAddress || email}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-sm font-medium">Plan:</span> 
                {is_pro ? (
                  <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-600 text-xs font-medium border-0 py-1">
                    {plan?.toUpperCase()}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs py-0.5">
                    {plan?.toUpperCase()}
                  </Badge>
                )}
              </div>
              {!is_pro && (
                <Link href="/pricing">
                  <Button variant="outline" size="sm" className="w-full mt-1 text-xs font-medium bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 border-border/30">
                    Upgrade to Premium
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2 border-b border-border/10">
              <CardTitle className="text-xl">Usage This Period</CardTitle>
              <CardDescription className="text-xs opacity-70">
                {is_pro 
                  ? `You've used ${summariesUsed} of your ${summaryLimit} premium summaries this month.` 
                  : `You've used ${summariesUsed} of your ${summaryLimit} free summaries today.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {is_pro ? (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="h-3 w-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out transform origin-left ${
                          usagePercentage <= 25 
                            ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-lg shadow-green-500/25' 
                            : usagePercentage <= 50
                            ? 'bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg shadow-blue-500/25'
                            : usagePercentage <= 75
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25'
                            : 'bg-gradient-to-r from-red-400 to-rose-500 shadow-lg shadow-red-500/25'
                        }`}
                        style={{ 
                          width: `${usagePercentage}%`,
                          animation: 'progressGrow 1.5s ease-out'
                        }}
                      />
                      {usagePercentage > 0 && (
                        <div 
                          className="absolute top-0 h-full w-1 bg-white/30 animate-pulse rounded-full"
                          style={{ 
                            left: `${Math.max(usagePercentage - 2, 0)}%`,
                            animation: 'glowPulse 2s ease-in-out infinite'
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        usagePercentage <= 25 ? 'bg-green-500' :
                        usagePercentage <= 50 ? 'bg-blue-500' :
                        usagePercentage <= 75 ? 'bg-amber-500' : 'bg-red-500'
                      } animate-pulse`} />
                      <span className="text-muted-foreground font-medium">{summariesUsed} used</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                      usagePercentage <= 25 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                        : usagePercentage <= 50
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : usagePercentage <= 75
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {usagePercentage}%
                    </div>
                    <span className="text-muted-foreground font-medium">{summaryLimit} monthly</span>
                  </div>
                  <div className="flex items-center text-green-600 space-x-2 mt-3 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800/50">
                    <div className="p-1.5 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full shadow-lg">
                      <Zap className="h-4 w-4 text-white animate-pulse" />
                    </div>
                    <span className="text-sm font-semibold">Premium Plan Active</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="h-3 w-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out transform origin-left ${
                          usagePercentage <= 50 
                            ? 'bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg shadow-blue-500/25' 
                            : usagePercentage <= 75
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25'
                            : 'bg-gradient-to-r from-red-400 to-rose-500 shadow-lg shadow-red-500/25'
                        }`}
                        style={{ 
                          width: `${usagePercentage}%`,
                          animation: 'progressGrow 1.5s ease-out'
                        }}
                      />
                      {usagePercentage > 0 && (
                        <div 
                          className="absolute top-0 h-full w-1 bg-white/30 rounded-full"
                          style={{ 
                            left: `${Math.max(usagePercentage - 2, 0)}%`,
                            animation: 'glowPulse 2s ease-in-out infinite'
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        usagePercentage <= 50 ? 'bg-blue-500' :
                        usagePercentage <= 75 ? 'bg-amber-500' : 'bg-red-500'
                      } animate-pulse`} />
                      <span className="text-muted-foreground font-medium">{summariesUsed} used</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                      usagePercentage <= 50 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : usagePercentage <= 75
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {usagePercentage}%
                    </div>
                    <span className="text-muted-foreground font-medium">{summaryLimit} daily</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/10">
            <div>
              <CardTitle className="text-xl">Recent Summaries</CardTitle>
              <CardDescription className="text-sm opacity-70">View or manage your recent summaries</CardDescription>
            </div>
            {history.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="destructive" size="sm" onClick={handleClearAllSummaries} 
                      className="ml-auto bg-destructive/90 hover:bg-destructive">
                      <Settings className="h-3.5 w-3.5 mr-1.5" /> Clear All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete all summaries</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <div className="text-center text-muted-foreground p-12 bg-muted/5">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-3">
                  <Star className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-base">No summaries yet</p>
                <p className="text-sm opacity-70 mt-1">Try summarizing a page with the extension!</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/20">
                      <TableHead className="w-[65%] md:w-[70%] pl-4">Title / URL</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Date</TableHead>
                      <TableHead className="text-right pr-4 w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id} className="group border-b border-border/10 last:border-0 transition-colors hover:bg-muted/5">
                        <TableCell 
                          className="cursor-pointer py-3 pl-4"
                          onClick={() => handleViewSummary(item)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="p-1.5 rounded-md bg-primary/5 text-primary/80 mt-0.5">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate" title={item.title || 'Untitled Summary'}>
                                {item.title || 'Untitled Summary'}
                              </div>
                              {item.url && (
                                <div className="text-xs text-muted-foreground truncate mt-0.5" title={item.url}>
                                  {item.url.replace(/^https?:\/\/(www\.)?/, '')}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground hidden sm:table-cell py-3">
                          <div className="flex items-center justify-end space-x-1.5">
                            <Clock className="h-3 w-3 opacity-70" />
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3 pr-4">
                          <div className="flex justify-end">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSummary(item.id); }}
                                  >
                                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete summary</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {item.url && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a 
                                      href={item.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/30 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>Open original page</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {selectedSummary && (
          <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
            <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="pb-2">
                <DialogTitle className="pr-8 truncate text-lg font-bold">{selectedSummary.title || 'Summary Details'}</DialogTitle>
                {selectedSummary.url && (
                  <DialogDescription className="text-xs text-muted-foreground truncate mt-1">
                    <a href={selectedSummary.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {selectedSummary.url}
                    </a>
                  </DialogDescription>
                )}
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-1">
                <div className="space-y-4 py-3">
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">TL;DR:</h3>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <p className="text-muted-foreground text-sm break-words">
                        {selectedSummary.tldr}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Key Points:</h3>
                    <div className="bg-muted/30 rounded-md border p-3 max-h-[calc(40vh-2rem)]">
                      <ScrollArea className="h-full pr-2">
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
                          {selectedSummary.keyPoints?.map((point, index) => (
                            <li key={index} className="break-words">{point}</li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-3 mt-2 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </SignedIn>
  );
}
