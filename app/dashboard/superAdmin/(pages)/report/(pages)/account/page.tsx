"use client";
import React, { useState } from "react";
import ExchangeReport from "./_components/ExchangeReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const ExchangeReportPage = () => {
  const [activeTab, setActiveTab] = useState("exchange");

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Account Reports</h1>
        <div className="flex items-center gap-4">
          <Link href="account/history">
            <Button variant="outline" className="flex items-center gap-2">
              Account History Report <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      
      <Tabs defaultValue="exchange" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="exchange">Exchange Transactions</TabsTrigger>
        </TabsList>
        <TabsContent value="exchange">
          <ExchangeReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExchangeReportPage;
