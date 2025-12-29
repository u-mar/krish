'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/lib/config';
import { MdEventAvailable, MdProductionQuantityLimits } from 'react-icons/md';
import { MoveDownIcon } from 'lucide-react';
import { HiOutlineArrowDown } from 'react-icons/hi';
import { TbHourglassEmpty } from "react-icons/tb";
import { FaHourglassEnd } from 'react-icons/fa';

interface CardProps {
  title?: string;
  content: string | number;
  footer?: string;
  icon: React.ReactElement;
  bgColor: string;
}

export const revalidate = 10; // Revalidate every 10 seconds

const Card: React.FC<CardProps> = ({ title, content, icon, bgColor }) => {
  return (
    <div className={`flex items-center ${bgColor} text-white rounded-lg shadow-lg p-6 h-28`}>
      {/* Icon */}
      <div className="bg-white/20 p-4 rounded-full text-white mr-6">
        {icon}
      </div>
      {/* Text */}
      <div>
        {title && <div className="text-sm font-medium opacity-90">{title}</div>}
        <div className="text-3xl font-bold">{content}</div>
      </div>
    </div>
  );
};

const CardsDetails = ({ selectedLocation }: { selectedLocation?: string }) => {
  const [stats, setStats] = useState<{
    totalProducts: number;
    availableStock: number;
    lowStock: number;
    outOfStock: number;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const params = selectedLocation && selectedLocation !== 'all' 
          ? `?location=${selectedLocation}` 
          : '';
        const response = await axios.get(`${API}/superAdmin/dashboard/stats${params}`);
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedLocation]);

  if (loading) {
    return (
      <>
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          {/* Title Skeleton */}
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          {/* Content Skeleton */}
          <div className="h-8 bg-gray-300 rounded w-2/3"></div>
          {/* Footer Skeleton */}
          <div className="h-4 bg-gray-300 rounded w-1/2 mt-2"></div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-300 rounded w-2/3"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mt-2"></div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-300 rounded w-2/3"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mt-2"></div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-300 rounded w-2/3"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mt-2"></div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Total Products */}
      <Card
        title="Total Products"
        content={stats!.totalProducts.toLocaleString() }
        icon={<MdProductionQuantityLimits size={32} />}
        bgColor="bg-gradient-to-r from-blue-500 to-blue-600"
      />
      {/* Available Stock */}
      <Card
        title="Available Stock"
        content={stats!.availableStock.toLocaleString()}
        icon={<MdEventAvailable size={32} />}
        bgColor="bg-gradient-to-r from-green-500 to-green-600"
      />
      {/* Low Stock */}
      <Card
        title="Low Stock"
        content={stats!.lowStock.toLocaleString()}
        icon={<FaHourglassEnd size={32} />}
        bgColor="bg-gradient-to-r from-yellow-500 to-yellow-600"
      />
      {/* Out of Stock */}
      <Card
        title="Out of Stock"
        content={stats!.outOfStock.toLocaleString()}
        icon={<TbHourglassEmpty size={32} />}
        bgColor="bg-gradient-to-r from-red-500 to-red-600"
      />
    </>
  );
};

export default CardsDetails;
