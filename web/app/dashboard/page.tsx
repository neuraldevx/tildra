'use client'

import React, { useEffect, useState } from 'react';
import { useAuth, SignedIn, useUser } from '@clerk/nextjs'; // Combined Clerk imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Sparkles } from 'lucide-react'; // Combined Lucide imports
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

  if (!isUserLoaded || isLoading) return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card><CardHeader><Skeleton className="h-6 w-32"/></CardHeader><CardContent><Skeleton className="h-4 w-48"/><Skeleton className="h-4 w-32 mt-2"/></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-32"/></CardHeader><CardContent><Skeleton className="h-10 w-full"/></CardContent></Card>
        </div>
        <Card><CardHeader><Skeleton className="h-6 w-48"/></CardHeader><CardContent><Skeleton className="h-32 w-full"/></CardContent></Card>
    </div>
  );
  
  if (error && !isLoading) return (
     <div className="container mx-auto p-4 text-center text-red-500">
       Error: {error} <Button onClick={() => window.location.reload()} variant="outline" className="ml-2">Retry</Button>
     </div>
  );

  if (!isSignedIn) return (
    <div className="container mx-auto p-4 text-center">
        Please <Link href="/sign-in"><Button variant="link">sign in</Button></Link> to view your dashboard.
    </div>
  );

  if (!accountDetails) return <div className="container mx-auto p-4 text-center">Could not load account details.</div>;

  const { email, plan, summariesUsed, summaryLimit, is_pro } = accountDetails;

  return (
    <SignedIn> {/* Ensure UI is only rendered for signed-in users */}
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Account Info</CardTitle>
              <CardDescription className="text-xs">{user?.primaryEmailAddress?.emailAddress || email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm">Plan: <Badge variant={is_pro ? 'default' : 'secondary'} className={`text-xs ${is_pro ? 'bg-green-600 border-green-600 text-primary-foreground hover:bg-green-600/90' : ''}`}>{plan?.toUpperCase()}</Badge></div>
              {!is_pro && (
                <Link href="/pricing" className="mt-1.5 inline-block">
                  <Button variant="link" className="p-0 h-auto text-xs text-primary hover:underline">Upgrade to Pro</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Usage This Period</CardTitle>
              {is_pro ? (
                <CardDescription className="text-xs">You have unlimited summaries.</CardDescription>
              ) : (
                <CardDescription className="text-xs">You've used {summariesUsed} of your {summaryLimit} free summaries.</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {is_pro ? (
                <div className="flex items-center text-green-600 pt-1">
                  <Sparkles className="h-5 w-5 mr-1.5 text-yellow-400" />
                  <span className="text-sm font-medium">Unlimited Access</span>
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                   <Progress value={usagePercentage} className="h-2" />
                   <p className="text-xs text-muted-foreground">{summariesUsed} / {summaryLimit} used ({usagePercentage}%)</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl">Recent Summaries</CardTitle>
              <CardDescription className="text-sm">View or manage your recent summaries.</CardDescription>
            </div>
            {history.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearAllSummaries} className="ml-auto">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear All
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No summaries yet. Try summarizing a page with the extension!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[65%] md:w-[70%] pl-2">Title / URL</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right pr-2"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id} className="group">
                      <TableCell 
                        className="font-medium cursor-pointer hover:bg-muted/50 py-2 pl-2"
                        onClick={() => handleViewSummary(item)}
                      >
                        <div className="font-semibold text-sm truncate" title={item.title || 'Untitled Summary'}>{item.title || 'Untitled Summary'}</div>
                        {item.url && <div className="text-xs text-muted-foreground truncate" title={item.url}>{item.url}</div>}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground hidden sm:table-cell py-2">{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right py-2 pr-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteSummary(item.id); }} title="Delete summary">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {selectedSummary && (
          <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
            <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="pr-12 truncate">{selectedSummary.title || 'Summary Details'}</DialogTitle>
                {selectedSummary.url && (
                  <DialogDescription className="text-xs text-muted-foreground truncate">
                    <a href={selectedSummary.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {selectedSummary.url}
                    </a>
                  </DialogDescription>
                )}
              </DialogHeader>
              <div className="grid gap-4 py-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-1.5">TL;DR:</h3>
                  <p className="text-muted-foreground bg-muted/50 p-3 rounded-md overflow-hidden break-words">
                    {selectedSummary.tldr}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5">Key Points:</h3>
                  <ScrollArea className="h-auto max-h-48 w-full rounded-md border p-3">
                    <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                      {selectedSummary.keyPoints.map((point, index) => (
                        <li key={index} className="break-words">{point}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              </div>
              <DialogFooter>
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
