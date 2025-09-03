'use client';

import Pagination from "@/app/dashboard/_components/Pagination";
import { API } from "@/lib/config";
import { useEffect, useState } from "react";

type User = {
    id: string;
    name: string;
};

type ExchangeTransaction = {
    id: string;
    exchangeType: string;
    amount: string;
    account: {
        id: string;
        account: string;
    };
    senderName?: string;
    senderPhone?: string;
    receiverName?: string;
    receiverPhone?: string;
    tranDate: string;
};

type ReportData = {
    transactions: ExchangeTransaction[];
    summary: {
        totalDeposits: number;
        totalWithdrawals: number;
        totalDepositAmount: number;
        totalWithdrawalAmount: number;
    };
};

export default function ExchangeReport() {
    const itemsPerPage = 25; // Define items per page for pagination
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<{ id: string, name: string } | null>(null);
    const [dateRange, setDateRange] = useState<string>('all-time');
    const [fromDate, setFromDate] = useState<string | null>(null);
    const [toDate, setToDate] = useState<string | null>(null);
    const [exchangeType, setExchangeType] = useState<string>('all');
    const [results, setResults] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Pagination data slicing
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTransactions = results ? results.transactions.slice(indexOfFirstItem, indexOfLastItem) : [];

    const handlePageChange = (page: number) => setCurrentPage(page);
    // Fetch users for dropdown
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch(`${API}/viewer/user`);
                if (!response.ok) throw new Error("Error fetching users.");
                setUsers(await response.json());
            } catch (err) {
                setError("Error fetching users.");
            }
        };

        fetchUsers();
    }, []);

    const handleFilter = async () => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams({
                user: selectedUser?.id || 'all',
                dateRange: dateRange,
                fromDate: fromDate || '',
                toDate: toDate || '',
                exchangeType: exchangeType
            }).toString();

            const response = await fetch(`${API}/viewer/report/exchange?${queryParams}`);
            if (!response.ok) throw new Error("Error fetching exchange report data.");
            const data = await response.json();

            setResults(data);
        } catch (err) {
            setError("Error fetching report data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 ">Exchanges Report</h1>
            <section className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-xl shadow-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">

                    {/* Exchange Type Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Exchange Type</label>
                        <select
                            className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={exchangeType}
                            onChange={(e) => setExchangeType(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="deposit">Deposit</option>
                            <option value="withdrawal">Withdrawal</option>
                        </select>
                    </div>

                    {/* User Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">User</label>
                        <select
                            className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={selectedUser?.id || 'all'}
                            onChange={(e) => {
                                const selected = users.find((u) => u.id === e.target.value);
                                setSelectedUser(selected || null);
                            }}
                        >
                            <option value="all">All Users</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Date Range Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Date Range</label>
                        <select
                            className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={dateRange}
                            onChange={(e) => {
                                setDateRange(e.target.value);
                                setFromDate(null);
                                setToDate(null);
                            }}
                        >
                            <option value="all-time">All Time</option>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="this-week">This Week</option>
                            <option value="this-month">This Month</option>
                            <option value="this-year">This Year</option>
                            <option value="specific-date">Specific Date Range</option>
                        </select>
                    </div>

                    {/* Specific Date Range */}
                    {dateRange === 'specific-date' && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
                                <input
                                    type="date"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={fromDate || ''}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
                                <input
                                    type="date"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={toDate || ''}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Filter Button */}
                <div className="mt-6 text-center">
                    <button
                        onClick={handleFilter}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transform transition-transform duration-200 hover:scale-105 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Apply Filters'}
                    </button>
                </div>
            </section>


            {/* Error Message */}
            {error && <div className="text-red-500 bg-red-100 p-4 rounded-md">{error}</div>}

            {/* Summary Section */}
            {results && (
                <section className="bg-gradient-to-r from-blue-500 to-indigo-500 p-8 rounded-lg shadow-lg mb-6 text-white">
                    <h3 className="text-2xl font-bold mb-4 text-center">Exchange Transaction Summary</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        <div className="p-4 bg-white bg-opacity-20 rounded-lg shadow-md">
                            <h4 className="text-lg font-semibold mb-2">Total Deposits</h4>
                            <p className="text-3xl font-bold">{results.summary.totalDeposits}</p>
                        </div>
                        <div className="p-4 bg-white bg-opacity-20 rounded-lg shadow-md">
                            <h4 className="text-lg font-semibold mb-2">Total Deposit Amount</h4>
                            <p className="text-3xl font-bold">KES {results.summary.totalDepositAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-4 bg-white bg-opacity-20 rounded-lg shadow-md">
                            <h4 className="text-lg font-semibold mb-2">Total Withdrawals</h4>
                            <p className="text-3xl font-bold">{results.summary.totalWithdrawals}</p>
                        </div>
                        <div className="p-4 bg-white bg-opacity-20 rounded-lg shadow-md">
                            <h4 className="text-lg font-semibold mb-2">Total Withdrawal Amount</h4>
                            <p className="text-3xl font-bold">KES {results.summary.totalWithdrawalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </section>
            )}


            {/* Transaction Details Table */}
            {results && results.transactions.length > 0 && (
                <section className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4">Exchange Transaction Details</h3>
                    <div className="overflow-x-auto md:overflow-x-visible">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="py-3 px-6 border-b font-medium text-gray-700">Exchange Type</th>
                                    <th className="py-3 px-6 border-b font-medium text-gray-700">Account Type</th>
                                    <th className="py-3 px-6 border-b font-medium text-gray-700">Amount</th>
                                    <th className="py-3 px-6 border-b font-medium text-gray-700">Sender Name</th>
                                    <th className="py-3 px-6 border-b font-medium text-gray-700">Sender Phone</th>
                                    <th className="py-3 px-6 border-b font-medium text-gray-700">Receiver Name</th>
                                    <th className="py-3 px-6 border-b font-medium text-gray-700">Receiver Phone</th>
                                    <th className="py-3 px-6 border-b font-medium text-gray-700">Transaction Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentTransactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-gray-50 text-center">
                                        <td className="py-3 px-6 border-b">{transaction.exchangeType}</td>
                                        <td className="py-3 px-6 border-b">{transaction.account.account}</td>
                                        <td className="py-3 px-6 border-b">{transaction.amount}</td>
                                        <td className="py-3 px-6 border-b">{transaction.senderName || "-"}</td>
                                        <td className="py-3 px-6 border-b">{transaction.senderPhone || "-"}</td>
                                        <td className="py-3 px-6 border-b">{transaction.receiverName || "-"}</td>
                                        <td className="py-3 px-6 border-b">{transaction.receiverPhone || "-"}</td>
                                        <td className="py-3 px-6 border-b">
                                            {new Date(transaction.tranDate).toLocaleDateString("en-US")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination
                            totalItems={results.transactions.length}
                            itemsPerPage={itemsPerPage}
                            currentPage={currentPage}
                            onPageChange={handlePageChange}
                        />
                    </div>
                </section>
            )}
        </div>
    );
}
