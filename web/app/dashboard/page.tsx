'use client'

import React, { useEffect, useState } from 'react';
import { useAuth, SignedIn, useUser } from '@clerk/nextjs'; // Combined Clerk imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Sparkles, Calendar, Link as LinkIcon, ExternalLink } from 'lucide-react'; // Combined Lucide imports
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
  url: string | null;
  title: string | null;
  tldr: string;
  keyPoints: string[];
  createdAt: string;
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
      try {
        const token = await getToken();
        if (!token) throw new Error('Authentication token not available.');

        const headers = { Authorization: `Bearer ${token}` };
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''; // Use relative path if not set

        const [historyRes, accountRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/history`, { headers }),
          fetch(`${apiBaseUrl}/api/user/account-details`, { headers })
        ]);

        if (!historyRes.ok) throw new Error(`Failed to fetch history: ${historyRes.statusText} (${historyRes.status})`);
        const historyData = await historyRes.json();
        setHistory(historyData);

        if (!accountRes.ok) throw new Error(`Failed to fetch account details: ${accountRes.statusText} (${accountRes.status})`);
        const accountData = await accountRes.json();
        setAccountDetails(accountData);

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
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token not available.');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

      const res = await fetch(`${apiBaseUrl}/api/history/${summaryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Failed to delete summary.' }));
        throw new Error(errorData.detail || `Failed to delete summary: ${res.statusText}`);
      }
      setHistory(prevHistory => prevHistory.filter(item => item.id !== summaryId));
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('An unknown error occurred while deleting.');
      console.error(err);
    }
  };

  const handleClearAllSummaries = async () => {
    if (!confirm('Are you sure you want to delete ALL your summaries? This action cannot be undone.')) return;
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token not available.');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

      const res = await fetch(`${apiBaseUrl}/api/history`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Failed to clear summaries.' }));
        throw new Error(errorData.detail || `Failed to clear summaries: ${res.statusText}`);
      }
      setHistory([]);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('An unknown error occurred while clearing history.');
      console.error(err);
    }
  };

  const usageChartData = accountDetails ? [
    { 
      label: "Usage", 
      used: accountDetails.summariesUsed, 
      limit: accountDetails.is_pro ? (accountDetails.summaryLimit || 1 ) : accountDetails.summaryLimit // Handle limit for pro if needed
    }
  ] : [];
  
  const usagePercentage = accountDetails && !accountDetails.is_pro && accountDetails.summaryLimit > 0 
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
                  ? "You have unlimited summaries with your premium plan." 
                  : `You've used ${summariesUsed} of your ${summaryLimit} free summaries.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {is_pro ? (
                <div className="flex items-center text-green-600 space-x-2">
                  <div className="p-1.5 bg-green-50 dark:bg-green-950/30 rounded-full">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                  </div>
                  <span className="text-sm font-medium">Unlimited Access</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                    <Progress value={usagePercentage} className="h-full" 
                      style={{
                        background: usagePercentage > 75 
                          ? 'linear-gradient(90deg, #f97316 0%, #ef4444 100%)' 
                          : 'linear-gradient(90deg, #0ea5e9 0%, #6366f1 100%)'
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{summariesUsed} used</span>
                    <span className="font-medium">{usagePercentage}%</span>
                    <span>{summaryLimit} total</span>
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
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear All
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
                  <Sparkles className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-base">No summaries yet</p>
                <p className="text-sm opacity-70 mt-1">Try summarizing a page with the extension!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/20">
                    <TableHead className="w-[65%] md:w-[70%] pl-4">Title / URL</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right pr-4 w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <ScrollArea className="max-h-[500px]">
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id} className="group border-b border-border/10 last:border-0 transition-colors hover:bg-muted/5">
                        <TableCell 
                          className="cursor-pointer py-3 pl-4"
                          onClick={() => handleViewSummary(item)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="p-1.5 rounded-md bg-primary/5 text-primary/80 mt-0.5">
                              <LinkIcon className="h-4 w-4" />
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
                            <Calendar className="h-3 w-3 opacity-70" />
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
                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
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
                                      <ExternalLink className="h-3.5 w-3.5" />
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
                </ScrollArea>
              </Table>
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
                          {selectedSummary.keyPoints.map((point, index) => (
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
