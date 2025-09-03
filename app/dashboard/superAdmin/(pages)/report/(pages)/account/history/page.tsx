'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from '@/components/ui/dataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { API } from '@/lib/config';
import { Separator } from '@/components/ui/separator';

type Account = {
  id: string;
  account: string;
  balance: number;
  default: boolean;
}

type TimelineItem = {
  date: string;
  type: string;
  description: string;
  amount: number;
  balance: number;
  details: any;
}

type AccountHistoryData = {
  account: {
    id: string;
    name: string;
    currentBalance: number;
  };
  summary: {
    startingBalance: number;
    finalBalance: number;
    netChange: number;
    totalIn: number;
    totalOut: number;
    totalSwapIn: number;
    totalSwapOut: number;
    transactionCount: number;
    salesCount: number;
    swapCount: number;
  };
  timeline: TimelineItem[];
}

export default function AccountHistoryReport() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [fromDate, setFromDate] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [historyData, setHistoryData] = useState<AccountHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts on component mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch(`${API}/superAdmin/account`);
        if (!response.ok) {
          throw new Error("Failed to fetch accounts");
        }
        const data = await response.json();
        setAccounts(data);
        
        // Set default selected account if available
        if (data.length > 0) {
          const defaultAccount = data.find((acc: Account) => acc.default) || data[0];
          setSelectedAccountId(defaultAccount.id);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
        setError("Failed to load accounts. Please try again.");
      }
    };

    fetchAccounts();
  }, []);

  const fetchAccountHistory = async () => {
    if (!selectedAccountId || !fromDate || !toDate) {
      setError("Please select an account and date range.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        accountId: selectedAccountId,
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
      }).toString();

      const response = await fetch(`${API}/superAdmin/report/account/history?${queryParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch account history");
      }

      const data = await response.json();
      setHistoryData(data);
    } catch (error) {
      console.error("Error fetching account history:", error);
      setError("Failed to load account history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Define columns for the timeline table
  const columns: ColumnDef<TimelineItem>[] = [
    {
      accessorKey: 'date',
      header: 'Date & Time',
      cell: ({ row }) => {
        const date = new Date(row.original.date);
        return (
          <div>
            <div className="font-medium">{format(date, 'MMM dd, yyyy')}</div>
            <div className="text-xs text-muted-foreground">{format(date, 'hh:mm a')}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.type;
        let badgeVariant: 'default' | 'outline' | 'secondary' | 'destructive' = 'default';
        let label = type;

        switch (type) {
          case 'initial':
            badgeVariant = 'outline';
            label = 'Initial Balance';
            break;
          case 'transaction-in':
            badgeVariant = 'default';
            label = 'Transaction In';
            break;
          case 'transaction-out':
            badgeVariant = 'destructive';
            label = 'Transaction Out';
            break;
          case 'sale':
            badgeVariant = 'secondary';
            label = 'Sale';
            break;
          case 'swap-in':
            badgeVariant = 'default';
            label = 'Swap In';
            break;
          case 'swap-out':
            badgeVariant = 'destructive';
            label = 'Swap Out';
            break;
          default:
            break;
        }

        return <Badge variant={badgeVariant}>{label}</Badge>;
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const { description, details } = row.original;
        return (
          <div>
            <div className="font-medium">{description}</div>
            {details && details.user && (
              <div className="text-xs text-muted-foreground">By: {details.user}</div>
            )}
            {details && details.reference && (
              <div className="text-xs text-muted-foreground">Ref: {details.reference}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const { amount, type } = row.original;
        const isNegative = ['transaction-out', 'swap-out'].includes(type);
        
        return (
          <div className={cn(
            "text-right font-medium",
            isNegative ? "text-red-600" : type !== 'initial' ? "text-green-600" : ""
          )}>
            {isNegative ? '-' : type !== 'initial' ? '+' : ''}{amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        );
      },
    },
    {
      accessorKey: 'balance',
      header: 'Running Balance',
      cell: ({ row }) => {
        const balance = row.original.balance;
        return <div className="text-right font-bold">{balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>;
      },
    },
  ];

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">Account History Report</h1>
      
      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Select an account and date range to view its history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Account Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Account</label>
              <Select
                value={selectedAccountId}
                onValueChange={(value) => setSelectedAccountId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account} ({account.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* From Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "MMMM dd, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* To Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "MMMM dd, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Generate Report Button */}
          <div className="mt-6 flex justify-end">
            <Button 
              onClick={fetchAccountHistory} 
              disabled={isLoading || !selectedAccountId || !fromDate || !toDate}
            >
              {isLoading ? "Loading..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-md border border-red-200">
          {error}
        </div>
      )}
      
      {/* Results Section */}
      {historyData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{historyData.account.name}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Current Balance: {historyData.account.currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Balance Change
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  historyData.summary.netChange >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {historyData.summary.netChange >= 0 ? "+" : ""}
                  {historyData.summary.netChange.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(fromDate!), "MMM dd")} - {format(new Date(toDate!), "MMM dd, yyyy")}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Starting Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{historyData.summary.startingBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  As of {format(new Date(fromDate!), "MMM dd, yyyy")}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Final Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{historyData.summary.finalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  As of {format(new Date(toDate!), "MMM dd, yyyy")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Account Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-green-600">+{historyData.summary.totalIn.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  <span className="text-sm text-muted-foreground">Money In</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-red-600">-{historyData.summary.totalOut.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  <span className="text-sm text-muted-foreground">Money Out</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold">{historyData.summary.transactionCount}</span>
                  <span className="text-sm text-muted-foreground">Transactions</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold">{historyData.summary.salesCount}</span>
                  <span className="text-sm text-muted-foreground">Sales</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold">{historyData.summary.swapCount}</span>
                  <span className="text-sm text-muted-foreground">Swaps</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator className="my-6" />

          {/* Timeline Table */}
          <Card>
            <CardHeader>
              <CardTitle>Account Timeline</CardTitle>
              <CardDescription>
                Chronological history of all account activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyData.timeline.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={historyData.timeline}
                  search="description"
                />
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  No transactions found in the selected date range.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
