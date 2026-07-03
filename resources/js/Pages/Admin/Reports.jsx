import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';
import { Banknote, Calendar, Package, Users, ClipboardList, TrendingUp, AlertTriangle, Clock, Star } from 'lucide-react';

const COLORS = ['#0D2A94', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

// Format date to month name and day (e.g., "January 15")
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};

// Format time to 12-hour or 24-hour format (e.g., "2:00" or "14:00")
const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const min = parseInt(minutes);
    
    // 24-hour format
    return `${hour}:${min.toString().padStart(2, '0')}`;
};

// Star rating component
const StarRating = ({ rating }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
        <div className="flex items-center gap-1">
            {[...Array(fullStars)].map((_, i) => (
                <Star key={`full-${i}`} size={16} fill="#F59E0B" color="#F59E0B" />
            ))}
            {hasHalfStar && (
                <Star size={16} fill="#F59E0B" color="#F59E0B" style={{ opacity: 0.5 }} />
            )}
            {[...Array(emptyStars)].map((_, i) => (
                <Star key={`empty-${i}`} size={16} fill="none" color="#D1D5DB" />
            ))}
            <span className="ml-1 text-sm text-gray-600">({rating.toFixed(1)})</span>
        </div>
    );
};

export default function Reports() {
    const { auth } = usePage().props;
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        overview: null,
        financial: null,
        revenueByService: null,
        consumableProductSales: null,
        bookings: null,
        jobOrders: null,
        inventory: null,
        customers: null,
        staff: null,
    });

    useEffect(() => {
        fetchOverviewData();
    }, []);

    const fetchOverviewData = async () => {
        try {
            const response = await fetch('/admin/reports/overview', {
                headers: { 'Accept': 'application/json' },
            });
            const result = await response.json();
            setData(prev => ({ ...prev, overview: result }));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching overview:', error);
            setLoading(false);
        }
    };

    const fetchFinancialData = async () => {
        try {
            console.log('Fetching financial data...');
            const response = await fetch('/admin/reports/financial', {
                headers: { 'Accept': 'application/json' },
            });
            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Financial data:', result);
            setData(prev => ({ ...prev, financial: result }));
        } catch (error) {
            console.error('Error fetching financial:', error);
        }
    };

    const fetchRevenueByService = async () => {
        try {
            const response = await fetch('/admin/reports/revenue-by-service', {
                headers: { 'Accept': 'application/json' },
            });
            const result = await response.json();
            setData(prev => ({ ...prev, revenueByService: result }));
        } catch (error) {
            console.error('Error fetching revenue by service:', error);
        }
    };

    const fetchConsumableProductSales = async () => {
        try {
            const response = await fetch('/admin/reports/consumable-product-sales', {
                headers: { 'Accept': 'application/json' },
            });
            const result = await response.json();
            setData(prev => ({ ...prev, consumableProductSales: result }));
        } catch (error) {
            console.error('Error fetching consumable product sales:', error);
        }
    };

    const fetchBookingsData = async () => {
        try {
            const response = await fetch('/admin/reports/bookings', {
                headers: { 'Accept': 'application/json' },
            });
            const result = await response.json();
            setData(prev => ({ ...prev, bookings: result }));
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    const fetchJobOrdersData = async () => {
        try {
            const response = await fetch('/admin/reports/job-orders', {
                headers: { 'Accept': 'application/json' },
            });
            const result = await response.json();
            setData(prev => ({ ...prev, jobOrders: result }));
        } catch (error) {
            console.error('Error fetching job orders:', error);
        }
    };

    const fetchInventoryData = async () => {
        try {
            const response = await fetch('/admin/reports/inventory', {
                headers: { 'Accept': 'application/json' },
            });
            const result = await response.json();
            setData(prev => ({ ...prev, inventory: result }));
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    const fetchCustomersData = async () => {
        try {
            const response = await fetch('/admin/reports/customers', {
                headers: { 'Accept': 'application/json' },
            });
            const result = await response.json();
            setData(prev => ({ ...prev, customers: result }));
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const fetchStaffData = async () => {
        try {
            const response = await fetch('/admin/reports/staff', {
                headers: { 'Accept': 'application/json' },
            });
            const result = await response.json();
            setData(prev => ({ ...prev, staff: result }));
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        switch (tab) {
            case 'financial':
                if (!data.financial) fetchFinancialData();
                if (!data.revenueByService) fetchRevenueByService();
                if (!data.consumableProductSales) fetchConsumableProductSales();
                break;
            case 'bookings':
                if (!data.bookings) fetchBookingsData();
                break;
            case 'jobOrders':
                if (!data.jobOrders) fetchJobOrdersData();
                break;
            case 'inventory':
                if (!data.inventory) fetchInventoryData();
                break;
            case 'customers':
                if (!data.customers) fetchCustomersData();
                break;
            case 'staff':
                if (!data.staff) fetchStaffData();
                break;
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'financial', label: 'Financial', icon: Banknote },
        { id: 'bookings', label: 'Bookings', icon: Calendar },
        { id: 'jobOrders', label: 'Job Orders', icon: ClipboardList },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'customers', label: 'Customers', icon: Users },
    ];

    return (
        <AuthenticatedLayout user={auth?.user} header="Reports">
            <div className="space-y-6">
                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-2 border-b pb-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                                    activeTab === tab.id
                                        ? 'bg-[#0D2A94] text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {loading ? (
                            <div className="text-center py-12 text-gray-500">Loading...</div>
                        ) : data.overview ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard
                                        title="Total Bookings"
                                        value={data.overview.total_bookings}
                                        icon={Calendar}
                                        color="blue"
                                    />
                                    <StatCard
                                        title="Total Revenue"
                                        value={`₱${data.overview.total_revenue?.toLocaleString() || 0}`}
                                        icon={Banknote}
                                        color="green"
                                    />
                                    <StatCard
                                        title="Total Customers"
                                        value={data.overview.total_customers}
                                        icon={Users}
                                        color="purple"
                                    />
                                    <StatCard
                                        title="Active Job Orders"
                                        value={data.overview.active_job_orders}
                                        icon={ClipboardList}
                                        color="orange"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StatCard
                                        title="Pending Bookings"
                                        value={data.overview.pending_bookings}
                                        icon={AlertTriangle}
                                        color="yellow"
                                    />
                                    <StatCard
                                        title="Low Stock Products"
                                        value={data.overview.low_stock_products}
                                        icon={Package}
                                        color="red"
                                    />
                                </div>
                            </>
                        ) : null}
                    </div>
                )}

                {/* Financial Tab */}
                {activeTab === 'financial' && (
                    <div className="space-y-6">
                        {data.financial && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <StatCard
                                        title="Total Daily Revenue"
                                        value={`₱${data.financial.total_daily_revenue?.toLocaleString() || 0}`}
                                        icon={Banknote}
                                        color="blue"
                                    />
                                    <StatCard
                                        title="Total Product Sales"
                                        value={`₱${data.financial.total_product_sales?.toLocaleString() || 0}`}
                                        icon={Package}
                                        color="green"
                                    />
                                    <StatCard
                                        title="Total Revenue by Service"
                                        value={`₱${data.revenueByService?.total_revenue_by_service?.toLocaleString() || 0}`}
                                        icon={ClipboardList}
                                        color="purple"
                                    />
                                </div>

                                <ChartCard title="Daily Revenue">
                                    {Array.isArray(data.financial.daily_revenue) && data.financial.daily_revenue?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={data.financial.daily_revenue}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" tickFormatter={formatDate} />
                                                <YAxis />
                                                <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} labelFormatter={formatDate} />
                                                <Line type="monotone" dataKey="total" stroke="#0D2A94" strokeWidth={2} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-gray-500">
                                            No daily revenue data available
                                        </div>
                                    )}
                                </ChartCard>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <ChartCard title="Revenue by Amount Type">
                                        {Array.isArray(data.financial.revenue_by_amount_type) && data.financial.revenue_by_amount_type?.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={data.financial.revenue_by_amount_type}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="amount_type" />
                                                    <YAxis />
                                                    <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                                                    <Bar dataKey="total" fill="#0D2A94" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-[300px] text-gray-500">
                                                No amount type data available
                                            </div>
                                        )}
                                    </ChartCard>
                                </div>

                                {Array.isArray(data.revenueByService?.revenue) && data.revenueByService.revenue?.length > 0 ? (
                                    <ChartCard title="Revenue by Service">
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart data={data.revenueByService.revenue} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="name" type="category" width={150} />
                                                <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                                                <Bar dataKey="total_revenue" fill="#10B981" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartCard>
                                ) : (
                                    <ChartCard title="Revenue by Service">
                                        <div className="flex items-center justify-center h-[400px] text-gray-500">
                                            No revenue by service data available
                                        </div>
                                    </ChartCard>
                                )}

                                {Array.isArray(data.consumableProductSales) && data.consumableProductSales.length > 0 ? (
                                    <ChartCard title="Consumable Product Sales">
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart data={data.consumableProductSales} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="name" type="category" width={150} />
                                                <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                                                <Bar dataKey="total_sales" fill="#F59E0B" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartCard>
                                ) : (
                                    <ChartCard title="Consumable Product Sales">
                                        <div className="flex items-center justify-center h-[400px] text-gray-500">
                                            No consumable product sales data available
                                        </div>
                                    </ChartCard>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Bookings Tab */}
                {activeTab === 'bookings' && data.bookings && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Booking Status">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={data.bookings.booking_status}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="count"
                                        >
                                            {data.bookings.booking_status?.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title="Service Popularity">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={data.bookings.service_popularity}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="booking_count" fill="#0D2A94" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>

                        <ChartCard title="Daily Bookings">
                            {data.bookings.daily_bookings?.length > 0 ? (
                                <ResponsiveContainer width="100%" height={350}>
                                    <LineChart data={data.bookings.daily_bookings}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                        <XAxis dataKey="date" tickFormatter={formatDate} stroke="#666" />
                                        <YAxis stroke="#666" />
                                        <Tooltip 
                                            labelFormatter={formatDate}
                                            formatter={(value) => [value, 'Bookings']}
                                            contentStyle={{ 
                                                backgroundColor: '#fff', 
                                                border: '1px solid #ddd',
                                                borderRadius: '8px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="count" 
                                            stroke="#0D2A94" 
                                            strokeWidth={3}
                                            dot={{ fill: '#0D2A94', r: 4 }}
                                            activeDot={{ r: 6, stroke: '#0D2A94', strokeWidth: 2 }}
                                        />
                                        {(() => {
                                            const counts = data.bookings.daily_bookings.map(d => d.count);
                                            const maxCount = Math.max(...counts);
                                            const minCount = Math.min(...counts);
                                            const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
                                            
                                            return (
                                                <>
                                                    <ReferenceLine y={avgCount} stroke="#10B981" strokeDasharray="5 5" label="Average" />
                                                    {data.bookings.daily_bookings.map((entry, index) => {
                                                        if (entry.count === maxCount && maxCount > avgCount) {
                                                            return (
                                                                <ReferenceDot 
                                                                    key={`max-${index}`}
                                                                    x={entry.date} 
                                                                    y={entry.count} 
                                                                    r={8} 
                                                                    fill="#EF4444" 
                                                                    stroke="white" 
                                                                    strokeWidth={2}
                                                                    label="High"
                                                                />
                                                            );
                                                        }
                                                        if (entry.count === minCount && minCount < avgCount) {
                                                            return (
                                                                <ReferenceDot 
                                                                    key={`min-${index}`}
                                                                    x={entry.date} 
                                                                    y={entry.count} 
                                                                    r={8} 
                                                                    fill="#F59E0B" 
                                                                    stroke="white" 
                                                                    strokeWidth={2}
                                                                    label="Low"
                                                                />
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                </>
                                            );
                                        })()}
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[350px] text-gray-500">
                                    No daily bookings data available
                                </div>
                            )}
                        </ChartCard>

                        <ChartCard title="Average Rating Trend">
                            {data.bookings.daily_ratings?.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={data.bookings.daily_ratings}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                        <XAxis dataKey="date" tickFormatter={formatDate} stroke="#666" />
                                        <YAxis domain={[0, 5]} stroke="#666" />
                                        <Tooltip 
                                            labelFormatter={formatDate}
                                            formatter={(value) => [Number(value).toFixed(1), 'Rating']}
                                            contentStyle={{ 
                                                backgroundColor: '#fff', 
                                                border: '1px solid #ddd',
                                                borderRadius: '8px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="avg_rating" 
                                            stroke="#10B981" 
                                            strokeWidth={3}
                                            dot={{ fill: '#10B981', r: 4 }}
                                            activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                                        />
                                        <ReferenceLine y={data.bookings.average_rating} stroke="#0D2A94" strokeDasharray="5 5" label="Overall Avg" />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-gray-500">
                                    No rating data available
                                </div>
                            )}
                        </ChartCard>
                    </div>
                )}

                {/* Job Orders Tab */}
                {activeTab === 'jobOrders' && data.jobOrders && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Job Order Status">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={data.jobOrders.job_order_status}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="count"
                                        >
                                            {data.jobOrders.job_order_status?.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title="Staff Ratings">
                                {data.jobOrders.staff_ratings?.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-2 px-4">Staff Name</th>
                                                    <th className="text-left py-2 px-4">Avg Rating</th>
                                                    <th className="text-left py-2 px-4">Completed Jobs</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.jobOrders.staff_ratings.map((staff, index) => (
                                                    <tr key={index} className="border-b">
                                                        <td className="py-2 px-4">{staff.first_name} {staff.last_name}</td>
                                                        <td className="py-2 px-4">
                                                            <StarRating rating={Number(staff.avg_rating)} />
                                                        </td>
                                                        <td className="py-2 px-4">{staff.completed_jobs}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                                        No staff ratings data available
                                    </div>
                                )}
                            </ChartCard>
                        </div>

                        <ChartCard title="Daily Completed Job Orders">
                            {data.jobOrders.daily_completed_job_orders?.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={data.jobOrders.daily_completed_job_orders}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                        <XAxis dataKey="date" tickFormatter={formatDate} stroke="#666" />
                                        <YAxis stroke="#666" />
                                        <Tooltip 
                                            labelFormatter={formatDate}
                                            formatter={(value) => [value, 'Completed']}
                                            contentStyle={{ 
                                                backgroundColor: '#fff', 
                                                border: '1px solid #ddd',
                                                borderRadius: '8px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="count" 
                                            stroke="#10B981" 
                                            strokeWidth={3}
                                            dot={{ fill: '#10B981', r: 4 }}
                                            activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-gray-500">
                                    No completed job orders data available
                                </div>
                            )}
                        </ChartCard>
                    </div>
                )}

                {/* Inventory Tab */}
                {activeTab === 'inventory' && data.inventory && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Stock by Category">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={data.inventory.stock_by_category}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="total_stock" fill="#0D2A94" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title="Top Product Usage">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={data.inventory.product_usage}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="product.name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="total_used" fill="#EF4444" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg shadow-blue-900/20 p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <AlertTriangle className="text-red-500" size={20} />
                                Low Stock Products
                            </h3>
                            {data.inventory.low_stock_products.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-4">Product</th>
                                                <th className="text-left py-2 px-4">Category</th>
                                                <th className="text-left py-2 px-4">Current Stock</th>
                                                <th className="text-left py-2 px-4">Reorder Level</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.inventory.low_stock_products.map((product) => (
                                                <tr key={product.id} className="border-b">
                                                    <td className="py-2 px-4">{product.name}</td>
                                                    <td className="py-2 px-4">{product.inventory_category?.name}</td>
                                                    <td className="py-2 px-4 text-red-600 font-semibold">{product.current_stock}</td>
                                                    <td className="py-2 px-4">{product.reorder_level}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500">No low stock products</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Customers Tab */}
                {activeTab === 'customers' && data.customers && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard
                                title="Total Customers"
                                value={data.customers.total_customers}
                                icon={Users}
                                color="blue"
                            />
                            <StatCard
                                title="Repeat Customer Rate"
                                value={`${data.customers.repeat_customer_rate}%`}
                                icon={TrendingUp}
                                color="green"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Customer Registrations">
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={data.customers.customer_registrations}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tickFormatter={formatDate} />
                                        <YAxis />
                                        <Tooltip labelFormatter={formatDate} />
                                        <Line type="monotone" dataKey="count" stroke="#0D2A94" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title="Vehicle Distribution">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={data.customers.vehicle_distribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ brand, percent }) => `${brand}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="count"
                                        >
                                            {data.customers.vehicle_distribution?.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg shadow-blue-900/20 p-6">
                            <h3 className="text-lg font-semibold mb-4">Top Customers</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 px-4">Customer</th>
                                            <th className="text-left py-2 px-4">Bookings</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.customers.top_customers.map((customer, index) => (
                                            <tr key={index} className="border-b">
                                                <td className="py-2 px-4">{customer.first_name} {customer.last_name}</td>
                                                <td className="py-2 px-4">{customer.booking_count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Staff Tab */}
                {activeTab === 'staff' && data.staff && (
                    <div className="space-y-6">
                        <StatCard
                            title="Total Staff"
                            value={data.staff.total_staff}
                            icon={Users}
                            color="blue"
                        />

                        <div className="bg-white rounded-lg shadow-lg shadow-blue-900/20 p-6">
                            <h3 className="text-lg font-semibold mb-4">Staff Productivity</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 px-4">Staff Name</th>
                                            <th className="text-left py-2 px-4">Completed Jobs</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.staff.staff_productivity.map((staff, index) => (
                                            <tr key={index} className="border-b">
                                                <td className="py-2 px-4">{staff.name}</td>
                                                <td className="py-2 px-4">{staff.completed_jobs}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

function StatCard({ title, value, icon: Icon, color }) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        red: 'bg-red-50 text-red-600',
    };

    return (
        <div className="bg-white rounded-lg shadow-lg shadow-blue-900/20 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-full ${colorClasses[color] || colorClasses.blue}`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
}

function ChartCard({ title, children }) {
    return (
        <div className="bg-white rounded-lg shadow-lg shadow-blue-900/20 p-6">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            {children}
        </div>
    );
}
