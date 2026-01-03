'use client';
import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { API } from '@/lib/config';

ChartJS.register(ArcElement, Tooltip, Legend);

const ProfitByCategory = () => {
  const [period, setPeriod] = useState('this_year');
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

  // Predefined colors (extended to include 'Others')
  const backgroundColors = ['#D6FFB7', '#FFEEA9', '#A9E5FF', '#FFD3A5', '#E0E0E0'];
  const hoverBackgroundColors = ['#BFFF90', '#FFDB7D', '#79D0FF', '#FFB778', '#C7C7C7'];

  const fetchData = async (selectedPeriod: string) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/admin/dashboard/profit-by-category?period=${selectedPeriod}`
      );
      const apiData = response.data;

      // Sort data by total profit descending
      const sortedData = apiData.data.sort((a: any, b: any) => b.total - a.total);

      // Get top 4 categories
      const topCategories = sortedData.slice(0, 4);

      // Sum the rest into 'Others'
      const otherCategories = sortedData.slice(4);
      const othersTotal = otherCategories.reduce(
        (sum: number, item: any) => sum + item.total,
        0
      );

      // Prepare labels and data
      const chartLabels = topCategories.map((item: any) => item.category);
      const chartDataValues = topCategories.map((item: any) => item.total);

      if (othersTotal > 0) {
        chartLabels.push('Others');
        chartDataValues.push(othersTotal);
      }

      // Prepare data for the chart
      const data = {
        labels: chartLabels,
        datasets: [
          {
            label: 'Sales by Product',
            data: chartDataValues,
            backgroundColor: backgroundColors.slice(0, chartLabels.length),
            hoverBackgroundColor: hoverBackgroundColors.slice(0, chartLabels.length),
            borderWidth: 0,
          },
        ],
      };

      setChartData(data);
      setTotalProfit(apiData.totalProfit);
    } catch (error) {
      console.error('Error fetching profit by category:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(period);
  }, [period]);

  const options = {
    cutout: '70%', // Creates the "donut" effect
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 w-full lg:w-full flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0 lg:space-x-10 ">
      {/* Left Section: Donut Chart */}
      <div className="w-full lg:w-1/3 lg:h-48">
        {loading ? (
          // Loading skeleton for the chart
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse">
              <div className="h-32 w-32 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ) : chartData && chartData.labels.length > 0 ? (
          <Doughnut data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">No data available for this period.</div>
          </div>
        )}
      </div>

      {/* Right Section: Profit Details */}
      <div className="w-full lg:w-2/3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Sales by Product</h2>
          {/* Time Period Selector */
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

        {loading ? (
          // Loading skeleton for total profit and category details
          <div className="animate-pulse mt-4">
            {/* Total Profit Skeleton */}
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>

            {/* Category Details Skeleton */}
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : chartData && chartData.labels.length > 0 ? (
          <>
            <div className="text-4xl font-bold text-gray-900 mt-4">
              {totalProfit.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400 mb-4">Total Sales</div>

            <div className="space-y-3 lg:space-y-6 lg:h-64">
              {/* Category Details */}
              {chartData.labels.map((label: string, index: number) => (
                <div key={index} className="flex justify-between">
                  <span className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 inline-block rounded-full"
                      style={{
                        backgroundColor:
                          chartData.datasets[0].backgroundColor[index],
                      }}
                    ></span>
                    <span className="text-sm text-gray-600">{label}</span>
                  </span>
                  <span className="text-sm text-gray-600">
                    
                    {(
                      chartData.datasets[0].data[index] as number
                    ).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-gray-500 mt-4">No data available for this period.</div>
        )}
      </div>
    </div>
  );
};

export default ProfitByCategory;
