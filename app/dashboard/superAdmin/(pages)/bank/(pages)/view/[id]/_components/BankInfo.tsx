'use client';
import DeleteAlertDialog from "@/app/dashboard/_components/DeleteAlertDialog";
import PayDebtDialog from "@/app/dashboard/_components/PayDebtDialog";
import Link from "next/link";
import React from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { API } from "@/lib/config";
import Loading from "@/app/loading"; // Assuming you have a Loading component

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  cashBalance: number;
  digitalBalance: number;
  totalBalance: number;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  accountId: string;
  account: {
    id: string;
    account: string; // Account name (e.g., USD, KES)
  };
  details?: string | null;
  amount: number;
  amountPaid: number;
  acc: "cr" | "dr";
  cashBalance: number;
  digitalBalance: number;
  createdAt: Date;
}

interface BankInfoProps {
  bankId: string; // Only pass the bank ID now
}

const BankInfo: React.FC<BankInfoProps> = ({ bankId }) => {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["bankPayment", bankId],
    queryFn: () => axios.get(`${API}/superAdmin/bank/${bankId}`).then((res) => res.data),
    staleTime: 60 * 1000,
    retry: 3,
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return <div>Error loading bank information.</div>;
  }

  const bank = data.bank as BankAccount;
  const transactions = data.transactions as BankTransaction[];

  // Group transactions by account type and calculate remaining balances
  const accountBalances = transactions.reduce((acc, tx) => {
    const accountType = tx.account.account;
    if (!acc[accountType]) {
      acc[accountType] = { credit: 0, debit: 0 };
    }
    // For debits, use remaining balance (amount - amountPaid)
    // For credits, use full amount
    if (tx.acc === "cr") {
      acc[accountType].credit += tx.amount;
    } else {
      const remainingDebt = tx.amount - tx.amountPaid;
      acc[accountType].debit += remainingDebt;
    }
    return acc;
  }, {} as Record<string, { credit: number; debit: number }>);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{bank.name}</h1>
        <p className="text-gray-500">Account Number: {bank.accountNumber}</p>
      </div>

      {/* Display each account debt */}
      {Object.entries(accountBalances).map(([accountType, balance]) => {
        const totalBalance = balance.credit - balance.debit;
        return (
          <div key={accountType} className="text-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {accountType} Debt Owed:
              <span className={`ml-2 ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(totalBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </h2>
          </div>
        );
      })}

      {/* Action Buttons */}
      <div className="mt-4 flex gap-4 justify-center">
        <Link
          href={`/dashboard/superAdmin/bank/payment/add-payment?bankAccountId=${bank.id}&acc=debit`}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Add Debt
        </Link>
      </div>

      {/* Transactions Table */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">All Transactions</h3>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center">No transactions available</p>
        ) : (
          <div className="overflow-x-auto md:overflow-x-visible">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((tx) => {
                const remainingBalance = tx.amount - tx.amountPaid;
                const percentPaid = (tx.amountPaid / tx.amount) * 100;
                const isPaid = remainingBalance === 0;
                
                return (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.acc === 'cr' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {tx.acc === "cr" ? "Credit" : "Debit"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {tx.account.account}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {tx.acc === "dr" ? (
                      isPaid ? (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Paid
                        </span>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-700">
                            {percentPaid.toFixed(1)}% paid
                          </span>
                          <span className="text-xs text-gray-500">
                            Remaining: {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tx.details || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {tx.acc === "dr" && !isPaid && (
                        <PayDebtDialog
                          transactionId={tx.id}
                          amount={tx.amount}
                          amountPaid={tx.amountPaid}
                          role="superAdmin"
                        />
                      )}
                      <Link
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        href={`/dashboard/superAdmin/bank/payment/edit/${tx.id}`}
                      >
                        Edit
                      </Link>
                      <DeleteAlertDialog id={tx.id} type="bankPayment" />
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankInfo;
