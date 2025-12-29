'use client';

import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { API } from '@/lib/config';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const OrderSummary = ({ selectedLocation }: { selectedLocation?: string }) => {
  const [period, setPeriod] = useState('this_month');
  const [chartData, setChartData] = useState<any>(null);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Define the time periods
  const timePeriods = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'this_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'This Year', value: 'this_year' },
  ];

  const fetchData = async (selectedPeriod: string) => {
    setLoading(true);
    try {
      const locationParam = selectedLocation && selectedLocation !== 'all' 
        ? `&location=${selectedLocation}` 
        : '';
      const response = await axios.get(`${API}/superAdmin/dashboard/order-summary?period=${selectedPeriod}${locationParam}`);
      const apiData = response.data;

      // Prepare data for the line chart
      const data = {
        labels: apiData.labels,
        datasets: [
          {
            label: 'Total Sales',
            data: apiData.data,
            borderColor: '#FFD700', // Gold color for the line
            backgroundColor: 'rgba(255, 215, 0, 0.2)', // Transparent gold fill
            fill: true,
            tension: 0.4, // Creates the curve in the line
            pointRadius: 0, // Removes the data points
          },
        ],
      };

      setChartData(data);
      setTotalProfit(apiData.totalProfit);
    } catch (error) {
      console.error('Error fetching order summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(period);
  }, [period, selectedLocation]);

  // Chart options to control the layout and styling
  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false, // Hide the legend
      },
      tooltip: {
        backgroundColor: '#000000', // Set the tooltip background to black
        titleColor: '#FFFFFF', // Set the title text color to white
        bodyColor: '#FFFFFF', // Set the body text color to white
        titleFont: {
          family: 'Arial',
          weight: 'bold' as const,
          size: 12,
        },
        bodyFont: {
          family: 'Arial',
          weight: 'normal' as const,
          size: 14,
        },
        padding: 12, // Add some padding to make the tooltip content more spacious
        displayColors: false, // Remove the color indicator box next to the tooltip
        callbacks: {
          label: function (tooltipItem: any) {
            return `${tooltipItem.raw.toLocaleString()}`; // Format the value with a dollar sign and commas
          },
        },
        borderColor: '#FFD700', // Gold border for the tooltip
        borderWidth: 2,
      },
    },
    scales: {
      x: {
        grid: {
          display: false, // Hide the vertical grid lines
        },
      },
      y: {
        ticks: {
          callback: function (value: any) {
            return `${value / 1000}K`; // Customize y-axis labels (convert to thousands)
          },
        },
        grid: {
          color: '#F1F1F1', // Light grid lines for the y-axis
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 w-full lg:w-full lg:h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>
        {/* Time Period Selector */}
        <select
          className="text-sm text-gray-400 bg-transparent focus:outline-none"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {timePeriods.map((timePeriod) => (
            <option key={timePeriod.value} value={timePeriod.value}>
              {timePeriod.label}
            </option>
          ))}
        </select>
      </div>

      {/* Total Profit */}
      {loading ? (
        // Loading skeleton for Total Profit
        <div className="animate-pulse mt-4">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        </div>
      ) : (
        <>
          <div className="text-4xl font-bold text-gray-900 mt-4">
            {totalProfit.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400 mb-4">Total Sales</div>
        </>
      )}

      {/* Line Chart */}
      <div className="mt-6 lg:h-64">
        {loading ? (
          // Loading skeleton for the chart
          <div className="animate-pulse h-full w-full bg-gray-200 rounded"></div>
        ) : chartData ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="text-gray-500">No data available for this period.</div>
        )}
      </div>
    </div>
  );
};

export default OrderSummary;
