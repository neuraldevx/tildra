'use client'

import { SignedIn, useUser, useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/shared/header"; // Assuming shared header
import { Summarizer } from "@/components/dashboard/summarizer"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Logo } from "@/components/ui/logo"
import Link from "next/link"
import { Sparkles, TrendingUp } from "lucide-react"
import { auth } from "@clerk/nextjs/server"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Library } from "@/components/dashboard/library"
import { TimeSavedAnalytics } from "@/components/dashboard/time-saved-analytics"

// Import Card and Chart components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts" // Import Recharts components
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table" // Import Table components

// Updated type for Account Details
type UserAccountDetails = {
  email: string | null;
  plan: string;
  summariesUsed: number;
  summaryLimit: number;
  is_pro: boolean; 
  // isLoggedIn: boolean; // This will be derived from Clerk's isSignedIn
};

// Updated type for History Item to match backend (assuming schema.prisma fields)
type HistoryItem = { 
  id: string;
  url: string | null;
  title: string | null;
  tldr: string;
  keyPoints: string[];
  createdAt: string; // Assuming ISO string from backend
  // updatedAt: string;
};

// Placeholder chart config (can be refined)
const chartConfig = {
  used: {
    label: "Used",
    color: "hsl(var(--chart-1))",
  },
  limit: {
    label: "Limit",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth(); // Get token function

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [accountDetails, setAccountDetails] = useState<UserAccountDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
        
        // Fetch Account Details (ensure it includes summariesUsed and summaryLimit)
        const accountResponse = await fetch(`${apiBaseUrl}/api/user/account-details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!accountResponse.ok) {
          const errorData = await accountResponse.json();
          // Try to parse specific error detail
          let errorMessage = 'Failed to fetch account details';
          if (errorData && errorData.detail) {
            errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
          } else if (accountResponse.statusText) {
            errorMessage = `${accountResponse.status}: ${accountResponse.statusText}`;
          }
          throw new Error(errorMessage);
        }
        const accountData: UserAccountDetails = await accountResponse.json();
        setAccountDetails(accountData);

        // Fetch History
        const historyResponse = await fetch(`${apiBaseUrl}/api/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!historyResponse.ok) {
           // Try to parse specific error detail
           let historyErrorMessage = 'Failed to fetch history';
           try {
             const historyErrorData = await historyResponse.json();
             if (historyErrorData && historyErrorData.detail) {
               historyErrorMessage = typeof historyErrorData.detail === 'string' ? historyErrorData.detail : JSON.stringify(historyErrorData.detail);
             } else if (historyResponse.statusText) {
                historyErrorMessage = `${historyResponse.status}: ${historyResponse.statusText}`;
             }
           } catch (parseError) {
             // If parsing error fails, use status text
             historyErrorMessage = historyResponse.statusText || 'Failed to fetch history (unknown error)';
           }
           throw new Error(historyErrorMessage);
        }
        const historyData: HistoryItem[] = await historyResponse.json();
        setHistory(historyData);

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message || "An error occurred while loading data.");
      } finally {
        setIsLoading(false);
      }
    };

    if (isSignedIn) { // Only fetch if Clerk reports user is signed in
      fetchData();
    } else if (isUserLoaded) { // If user is loaded but not signed in
      setIsLoading(false);
    }
  }, [isSignedIn, isUserLoaded, getToken]); // Re-run if auth state changes

  // Prepare data for the chart (use actual data when available)
  const usageChartData = accountDetails ? [
    { 
      label: "Usage", 
      used: accountDetails.summariesUsed, 
      limit: accountDetails.is_pro ? Infinity : accountDetails.summaryLimit // Or handle differently for Pro
    } 
  ] : [];
  
  const usagePercentage = accountDetails && !accountDetails.is_pro && accountDetails.summaryLimit > 0 
    ? Math.round((accountDetails.summariesUsed / accountDetails.summaryLimit) * 100) 
    : accountDetails?.is_pro ? 0 : 0; // Show 0% for pro or if limit is 0

  return (
    <SignedIn> { /* Route protection via middleware is primary, this hides UI */}
      <div className="flex flex-col min-h-screen">
        {/* <Header /> */}
        <main className="flex-1 container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
          
          <section className="mb-8 grid md:grid-cols-2 gap-6">
             <Card>
               <CardHeader>
                 <CardTitle>Account Info</CardTitle>
               </CardHeader>
               <CardContent>
                 {(!isUserLoaded) ? (
                  <div className="space-y-2">
                     <Skeleton className="h-4 w-48" />
                     <Skeleton className="h-4 w-24" />
                  </div>
                ) : !isSignedIn ? (
                     <p className="text-muted-foreground">Please sign in.</p>
                ) : (
                  <div className="text-foreground/80 space-y-1">
                    <p>Email: {user?.primaryEmailAddress?.emailAddress}</p>
                    {isLoading && !accountDetails ? (
                       <Skeleton className="h-4 w-24 mt-1" />
                    ) : (
                       <p>Plan: <span className="capitalize">{accountDetails?.plan}</span> {accountDetails?.is_pro ? <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full dark:bg-green-700 dark:text-green-100">PRO</span> : ''}</p>
                    )}
                     {/* Display usage text only if loaded and not pro */}
                     {!accountDetails?.is_pro && !isLoading && accountDetails && (
                       <p>Usage: {accountDetails.summariesUsed} / {accountDetails.summaryLimit} summaries used this period.</p>
                     )}
                      {/* Add Upgrade Button if not pro */}
                     {!isLoading && accountDetails && !accountDetails.is_pro && (
                       <Link href="/pricing" className="inline-block mt-2 text-sm text-primary hover:underline">
                         Upgrade to Pro
                       </Link>
                     )}
                  </div>
                )}
               </CardContent>
             </Card>

             {/* New Usage Chart Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage This Period</CardTitle>
                   <CardDescription>
                    {accountDetails?.is_pro 
                       ? "You have unlimited summaries as a Pro user." 
                       : `Summaries used: ${accountDetails?.summariesUsed ?? '-'} / ${accountDetails?.summaryLimit ?? '-'}`
                     }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                   {isLoading && !accountDetails ? (
                     <Skeleton className="h-40 w-full" /> // Placeholder for chart loading
                   ) : error ? (
                      <p className="text-destructive text-center py-10">Could not load usage data.</p>
                   ) : accountDetails && !accountDetails.is_pro ? (
                      <ChartContainer config={chartConfig} className="h-[100px] w-full">
                        {/* Using a simple bar chart for Used vs Limit */}
                        <BarChart 
                           accessibilityLayer 
                           data={usageChartData} 
                           layout="vertical" 
                           margin={{ left: 10, right: 10 }}
                        >
                          <CartesianGrid horizontal={false} />
                           {/* Hide X axis for simple progress-like bar */}
                           <XAxis type="number" dataKey="limit" hide /> 
                           {/* Y axis shows the category label if needed, can be hidden */}
                           {/* <YAxis type="category" dataKey="label" hide /> */}
                          
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />} // Simpler tooltip
                          />
                           {/* Background bar representing the limit */}
                          <Bar 
                             dataKey="limit" 
                             fill="var(--color-limit, hsl(var(--muted)))" 
                             radius={4} 
                             barSize={30}
                             stackId="a" // Stack limit first
                             /> 
                          {/* Foreground bar representing usage */}
                          <Bar 
                            dataKey="used" 
                            fill="var(--color-used, hsl(var(--primary)))" 
                            radius={4} 
                            barSize={30}
                            stackId="a" // Stack used on top
                           /> 
                        </BarChart>
                      </ChartContainer>
                   ) : accountDetails && accountDetails.is_pro ? (
                      <div className="flex items-center justify-center h-[100px] text-muted-foreground">
                         {/* Optional: Show something visual for Pro users */}
                         <Sparkles className="w-8 h-8 text-yellow-500 mr-2" /> Unlimited Access
                      </div>
                   ) : (
                       <p className="text-muted-foreground text-center py-10">Usage data unavailable.</p>
                   )}
                </CardContent>
                {!accountDetails?.is_pro && (
                  <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="leading-none text-muted-foreground">
                       {isLoading && !accountDetails ? <Skeleton className="h-4 w-32" /> : 
                          `${usagePercentage}% of limit used.`}
                    </div>
                  </CardFooter>
                )}
              </Card>
          </section>

          {/* Refactored Recent Summaries Section */}
          <section>
             <Card>
               <CardHeader>
                 <CardTitle>Recent Summaries</CardTitle>
                 <CardDescription>Your most recent summaries.</CardDescription>
               </CardHeader>
               <CardContent>
                 {isLoading ? (
                   // Loading Skeleton for Table
                   <div className="space-y-4">
                     <div className="flex justify-between items-center"> <Skeleton className="h-5 w-3/4" /> <Skeleton className="h-5 w-1/4" /> </div>
                     <Skeleton className="h-px w-full" />
                     <div className="flex justify-between items-center"> <Skeleton className="h-5 w-3/4" /> <Skeleton className="h-5 w-1/4" /> </div>
                     <Skeleton className="h-px w-full" />
                     <div className="flex justify-between items-center"> <Skeleton className="h-5 w-3/4" /> <Skeleton className="h-5 w-1/4" /> </div>
                   </div>
                 ) : error ? (
                   <p className="text-destructive text-center py-4">{error}</p> 
                 ) : (
                   <Table>
                     {/* <TableCaption>A list of your recent summaries.</TableCaption> */}
                     <TableHeader>
                       <TableRow>
                         <TableHead className="w-[70%]">Title / URL</TableHead>
                         <TableHead className="text-right">Date Summarized</TableHead>
                         {/* <TableHead className="text-right">Actions</TableHead> */}
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {history.length === 0 ? (
                         <TableRow>
                           <TableCell colSpan={2} className="h-24 text-center text-muted-foreground"> 
                             No summary history found.
                           </TableCell>
                         </TableRow>
                       ) : (
                         history.map((item) => (
                           <TableRow key={item.id}>
                             <TableCell className="font-medium align-top py-3">
                                <a 
                                   href={item.url || '#'} 
                                   target="_blank" 
                                   rel="noopener noreferrer" 
                                   className={`block hover:underline ${!item.url ? 'pointer-events-none text-muted-foreground' : ''}`}
                                   title={item.title || 'Untitled Summary'} // Tooltip for full title
                                 >
                                 <span className="block truncate max-w-md">{item.title || 'Untitled Summary'}</span>
                               </a>
                               {item.url && 
                                 <a 
                                   href={item.url} 
                                   target="_blank" 
                                   rel="noopener noreferrer" 
                                   className="text-xs text-muted-foreground hover:underline block truncate max-w-md"
                                   title={item.url} // Tooltip for full URL
                                  >
                                  {item.url}
                                 </a>
                               }
                             </TableCell>
                             <TableCell className="text-right align-top text-xs text-muted-foreground py-3">
                               {new Date(item.createdAt).toLocaleDateString()}
                             </TableCell>
                             {/* <TableCell className="text-right align-top py-3"> */}
                               {/* TODO: Add Buttons here if needed */}
                               {/* <Button variant="outline" size="sm">View</Button> */}
                             {/* </TableCell> */}
                           </TableRow>
                         ))
                       )}
                     </TableBody>
                   </Table>
                 )}
               </CardContent>
             </Card>
          </section>

        </main>
      </div>
    </SignedIn>
  );
}
