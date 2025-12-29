'use client'
import { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { API } from "@/lib/config";
import { ArrowUpIcon, ArrowDownIcon, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";

// Define proper type for product
interface Product {
    id: string;
    productName: string;
    quantitySold: number;
    productPrice: number;
    totalSales: number;
    profit: number;
    imageUrl?: string;
    trend?: 'up' | 'down' | 'stable';
}

const TopProducts: React.FC<{ selectedLocation?: string }> = ({ selectedLocation }) => {
    const [topProducts, setTopProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTopProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            const locationParam = selectedLocation && selectedLocation !== 'all' 
                ? `?location=${selectedLocation}` 
                : '';
            const response = await axios.get(`${API}/superAdmin/dashboard/top-products${locationParam}`);
            setTopProducts(response.data);
        } catch (error) {
            console.error("Error fetching top products:", error);
            setError("Failed to load products. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTopProducts();
    }, [selectedLocation]);

    // Format currency consistently
    const formatCurrency = (amount: number) => {
        return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-12 xl:col-span-7"
        >
            <div className="rounded-lg border border-stroke bg-white p-5 shadow-lg transition-all hover:shadow-xl dark:border-strokedark dark:bg-boxdark sm:p-7.5">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-black dark:text-white md:text-2xl">
                            Top 10 Products
                        </h4>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Based on total sales and profit
                        </p>
                    </div>
                    
                    <button 
                        onClick={fetchTopProducts}
                        className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-all hover:bg-opacity-90"
                    >
                        <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>

                {error && (
                    <div className="mb-6 rounded-md bg-red-50 p-4 text-center text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        {error}
                        <button 
                            onClick={fetchTopProducts}
                            className="ml-3 text-sm underline"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Table for larger screens, hidden on mobile */}
                <div className="hidden md:block">
                    <div className="grid grid-cols-5 rounded-t-md bg-gray-100 dark:bg-meta-4">
                        <div className="p-4">
                            <h5 className="text-sm font-medium uppercase">Product</h5>
                        </div>
                        <div className="p-4 text-center">
                            <h5 className="text-sm font-medium uppercase">Quantity Sold</h5>
                        </div>
                        <div className="p-4 text-center">
                            <h5 className="text-sm font-medium uppercase">Price</h5>
                        </div>
                        <div className="p-4 text-center">
                            <h5 className="text-sm font-medium uppercase">Total Sales</h5>
                        </div>
                        <div className="p-4 text-center">
                            <h5 className="text-sm font-medium uppercase">Profit</h5>
                        </div>
                    </div>

                    {loading ? (
                        <div className="animate-pulse">
                            {[...Array(5)].map((_, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-5 border-b border-stroke dark:border-strokedark p-4"
                                >
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-5 bg-gray-300 dark:bg-gray-700 rounded mx-auto ${i === 0 ? 'w-4/5 ml-0' : 'w-2/3'}`}
                                        ></div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : topProducts.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-gray-500 dark:text-gray-400">No products data available</p>
                        </div>
                    ) : (
                        <div className="rounded-b-md overflow-hidden">
                            {topProducts.map((product, index) => (
                                <motion.div
                                    key={product.id || index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`grid grid-cols-5 border-b border-stroke hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4/30 transition-colors`}
                                >
                                    <div className="flex items-center gap-3 p-4">
                                        {product.imageUrl && (
                                            <div className="relative h-10 w-10 overflow-hidden rounded-md">
                                                <Image 
                                                    src={product.imageUrl} 
                                                    alt={product.productName} 
                                                    fill 
                                                    className="object-cover"
                                                />
                                            </div>
                                        )}
                                        <p className="font-medium text-black dark:text-white line-clamp-2">
                                            {product.productName}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center p-4">
                                        <p className="font-medium text-black dark:text-white">
                                            {product.quantitySold}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center p-4">
                                        <p className="font-medium text-black dark:text-white">
                                            KSH {formatCurrency(product.productPrice)}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center p-4">
                                        <p className="font-medium text-meta-3">
                                            KSH {formatCurrency(product.totalSales)}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center p-4">
                                        <div className="flex items-center">
                                            {product.trend === 'up' && <ArrowUpIcon className="mr-1 h-4 w-4 text-meta-3" />}
                                            {product.trend === 'down' && <ArrowDownIcon className="mr-1 h-4 w-4 text-meta-1" />}
                                            <p className="font-medium text-meta-5">
                                                KSH {formatCurrency(product.profit || 0)}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Card view for mobile */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {loading ? (
                        [...Array(3)].map((_, index) => (
                            <div key={index} className="animate-pulse rounded-lg border border-stroke p-4 dark:border-strokedark">
                                <div className="h-5 w-3/4 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
                                <div className="space-y-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="flex justify-between">
                                            <div className="h-4 w-1/3 bg-gray-300 dark:bg-gray-700 rounded"></div>
                                            <div className="h-4 w-1/3 bg-gray-300 dark:bg-gray-700 rounded"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : topProducts.length === 0 ? (
                        <div className="py-8 text-center">
                            <p className="text-gray-500 dark:text-gray-400">No products data available</p>
                        </div>
                    ) : (
                        topProducts.map((product, index) => (
                            <motion.div
                                key={product.id || index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="rounded-lg border border-stroke bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-strokedark dark:bg-boxdark"
                            >
                                <div className="mb-3 flex items-center">
                                    {product.imageUrl && (
                                        <div className="relative mr-3 h-12 w-12 overflow-hidden rounded-md">
                                            <Image 
                                                src={product.imageUrl} 
                                                alt={product.productName} 
                                                fill 
                                                className="object-cover"
                                            />
                                        </div>
                                    )}
                                    <h5 className="font-semibold text-black dark:text-white">
                                        {product.productName}
                                    </h5>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-gray-500 dark:text-gray-400">Quantity:</span>
                                        <span className="font-medium text-black dark:text-white">{product.quantitySold}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-500 dark:text-gray-400">Price:</span>
                                        <span className="font-medium text-black dark:text-white">KSH {formatCurrency(product.productPrice)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-500 dark:text-gray-400">Sales:</span>
                                        <span className="font-medium text-meta-3">KSH {formatCurrency(product.totalSales)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-500 dark:text-gray-400">Profit:</span>
                                        <div className="flex items-center">
                                            {product.trend === 'up' && <ArrowUpIcon className="mr-1 h-3 w-3 text-meta-3" />}
                                            {product.trend === 'down' && <ArrowDownIcon className="mr-1 h-3 w-3 text-meta-1" />}
                                            <span className="font-medium text-meta-5">KSH {formatCurrency(product.profit || 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default TopProducts;
