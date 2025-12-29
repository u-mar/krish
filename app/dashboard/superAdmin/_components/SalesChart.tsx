"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { API } from "@/lib/config";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false, loading: () => <p>Loading...</p> });

const SalesChart: React.FC<{ selectedLocation?: string }> = ({ selectedLocation }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [period, setPeriod] = useState<string>("this_month");
  const [loading, setLoading] = useState<boolean>(true);

  const periods = [
    { label: "This Week", value: "this_week" },
    { label: "This Month", value: "this_month" },
    { label: "This Year", value: "this_year" },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const locationParam = selectedLocation && selectedLocation !== 'all' 
        ? `&location=${selectedLocation}` 
        : '';
      const response = await axios.get(
        `${API}/superAdmin/dashboard/salesChart?period=${period}${locationParam}`
      );
      const data = response.data;

      setTotalRevenue(data.totalRevenue || 0); // Default to 0 if undefined
      setTotalProfit(data.totalProfit || 0); // Default to 0 if undefined

      setChartData([
        { name: "Total Revenue", data: data.revenueData || [] }, // Default to empty array
        { name: "Total Profit", data: data.profitData || [] }, // Default to empty array
      ]);

      setLabels(data.labels || []); // Default to empty array
    } catch (error) {
      console.error("Error fetching chart data", error);
      setTotalRevenue(0);
      setTotalProfit(0);
      setChartData([]);
      setLabels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, selectedLocation]);

  const options = {
    chart: {
      id: "revenue-profit-chart",
      type: "area" as const,
      height: 350,
      toolbar: { show: false },
    },
    colors: ["#3C50E0", "#80CAEE"],
    stroke: { curve: "smooth" as const, width: 2 },
    dataLabels: { enabled: false },
    legend: {
      position: "bottom" as const,
      horizontalAlign: "center" as const,
    },
    xAxis: {
      categories: labels,
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.2,
        inverseColors: false,
        opacityFrom: 0.8,
        opacityTo: 0,
      },
    },
    grid: {
      show: true,
    },
  };

  return (
    <div className="max-w-full w-full bg-white rounded-lg shadow dark:bg-gray-800 p-6">
      {/* Header Section */}
      <div className="flex flex-wrap justify-between items-center mb-5">
        {/* Total Metrics */}
        <div className="flex space-x-10">
          {loading ? (
            <div className="animate-pulse">
              {/* Revenue Loading Skeleton */}
              <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
              <div className="h-6 bg-gray-300 rounded w-32"></div>
            </div>
          ) : (
            <div>
              <h5 className="text-gray-500 dark:text-gray-400 leading-none font-normal mb-1">
                Revenue
              </h5>
              <p className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">
                {totalRevenue.toLocaleString()}
              </p>
            </div>
          )}
          {loading ? (
            <div className="animate-pulse">
              {/* Profit Loading Skeleton */}
              <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
              <div className="h-6 bg-gray-300 rounded w-32"></div>
            </div>
          ) : (
            <div>
              <h5 className="text-gray-500 dark:text-gray-400 leading-none font-normal mb-1">
                Profit
              </h5>
              <p className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">
                {totalProfit.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Dropdown for Period Selection */}
        <div>
          <select
            className="px-4 py-2 rounded-lg border text-gray-900 bg-white hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {periods.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart Section */}
      <div id="line-chart" className="w-full">
        {loading ? (
          // Chart Loading Skeleton
          <div className="flex items-center justify-center h-72">
            <div className="animate-pulse w-full h-full bg-gray-300 rounded-lg"></div>
          </div>
        ) : chartData.length > 0 && chartData[0].data.length > 0 ? (
          <ReactApexChart
            options={options}
            series={chartData}
            type="area"
            height={350}
          />
        ) : (
          <div className="flex items-center justify-center h-72 text-gray-500">
            No data available.
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesChart;
