import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Dashboard({ auth, bookingStats, paymentStats, userStats, recentBookings, topServices, monthlyRevenue, dailyBookings, topCustomers, filters }) {
    const [startDate, setStartDate] = useState(filters?.start_date || '');
    const [endDate, setEndDate] = useState(filters?.end_date || '');

    console.log('Top customers data:', topCustomers);

    const StarRating = ({ rating, max = 5 }) => {
        const stars = [];
        for (let i = 1; i <= max; i++) {
            if (i <= rating) {
                stars.push(<span key={i} className="text-yellow-400">★</span>);
            } else if (i - 0.5 <= rating) {
                stars.push(<span key={i} className="text-yellow-400">★</span>);
            } else {
                stars.push(<span key={i} className="text-gray-300">★</span>);
            }
        }
        return <span className="flex">{stars}</span>;
    };

    const applyFilters = () => {
        router.get(route('dashboard'), {
            start_date: startDate,
            end_date: endDate,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        router.get(route('dashboard'), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };
    // Chart data preparation
    const revenueChartData = (monthlyRevenue || []).map(item => ({
        label: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        value: item.total
    }));

    const serviceChartData = (topServices || []).map(service => ({
        label: service.name,
        value: service.avg_rating || 0,
        bookings: service.bookings_count,
        revenue: service.revenue
    }));

    const userChartData = [
        { label: 'Customers', value: userStats.customers, color: '#8B5CF6' },
        { label: 'Staff', value: userStats.staff, color: '#3B82F6' },
        { label: 'Admins', value: userStats.admins, color: '#6B7280' }
    ];

    // Gantt chart data preparation
    const ganttData = (dailyBookings || []).reduce((acc, booking) => {
        const existing = acc.find(item => item.date === booking.date);
        if (existing) {
            existing[booking.status] = (existing[booking.status] || 0) + booking.count;
        } else {
            acc.push({
                date: booking.date,
                pending: booking.status === 'pending' ? booking.count : 0,
                accepted: booking.status === 'accepted' ? booking.count : 0,
                completed: booking.status === 'completed' ? booking.count : 0,
                rejected: booking.status === 'rejected' ? booking.count : 0
            });
        }
        return acc;
    }, []).sort((a, b) => new Date(a.date) - new Date(b.date));
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                </div>
            }
        >
            <Head title="Admin Dashboard" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {/* Welcome Section */}
                    <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                        <div className="p-6">
                            <h2 className="font-bold text-2xl text-blue-900 mb-2">Admin Dashboard</h2>
                            <p className="text-blue-900 font-semibold">Welcome back, {auth.user.name}</p>
                        </div>
                    </div>
                    {/* Date Filter Section */}
                    <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                        <div className="bg-blue-900 px-6 py-4 border-b border-blue-800">
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Date Filter</h3>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-xs font-semibold text-blue-900 mb-2">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-xs font-semibold text-blue-900 mb-2">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={applyFilters}
                                        className="px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors shadow-[0_2px_8px_rgba(30,58,138,0.2)]"
                                    >
                                        Apply Filter
                                    </button>
                                    <button
                                        onClick={clearFilters}
                                        className="px-4 py-2 bg-white text-blue-900 text-sm font-semibold rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors shadow-[0_2px_8px_rgba(30,58,138,0.1)]"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Stats Cards - Professional Enterprise Style */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Booking Stats */}
                        <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                            <div className="bg-blue-900 px-4 py-3 border-b border-blue-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-white uppercase tracking-wide">Bookings</span>
                                    <span className="text-xs text-blue-200">Total</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="text-2xl font-bold text-blue-900 mb-1 font-mono">{bookingStats.total}</h3>
                                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                    <div className="border border-blue-100 rounded-lg p-2 shadow-[0_2px_8px_rgba(30,58,138,0.1)]">
                                        <p className="font-semibold text-blue-900">{bookingStats.pending}</p>
                                        <p className="text-blue-600">Pending</p>
                                    </div>
                                    <div className="border border-blue-100 rounded-lg p-2 shadow-[0_2px_8px_rgba(30,58,138,0.1)]">
                                        <p className="font-semibold text-blue-900">{bookingStats.accepted}</p>
                                        <p className="text-blue-600">Accepted</p>
                                    </div>
                                    <div className="border border-blue-100 rounded-lg p-2 shadow-[0_2px_8px_rgba(30,58,138,0.1)]">
                                        <p className="font-semibold text-blue-900">{bookingStats.completed}</p>
                                        <p className="text-blue-600">Completed</p>
                                    </div>
                                    <div className="border border-blue-100 rounded-lg p-2 shadow-[0_2px_8px_rgba(30,58,138,0.1)]">
                                        <p className="font-semibold text-blue-900">{bookingStats.rejected}</p>
                                        <p className="text-blue-600">Rejected</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Revenue Stats */}
                        <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                            <div className="bg-blue-900 px-4 py-3 border-b border-blue-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-white uppercase tracking-wide">Revenue</span>
                                    <span className="text-xs text-blue-200">Total</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="text-2xl font-bold text-blue-900 mb-1 font-mono">₱{paymentStats.total_revenue.toLocaleString()}</h3>
                                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                                    <div className="border border-blue-100 rounded-lg p-2 shadow-[0_2px_8px_rgba(30,58,138,0.1)]">
                                        <p className="font-semibold text-blue-900">{paymentStats.paid_payments}</p>
                                        <p className="text-blue-600">Paid</p>
                                    </div>
                                    <div className="border border-blue-100 rounded-lg p-2 shadow-[0_2px_8px_rgba(30,58,138,0.1)]">
                                        <p className="font-semibold text-blue-900">{paymentStats.pending_payments}</p>
                                        <p className="text-blue-600">Pending</p>
                                    </div>
                                    <div className="border border-blue-100 rounded-lg p-2 shadow-[0_2px_8px_rgba(30,58,138,0.1)]">
                                        <p className="font-semibold text-blue-900">{paymentStats.failed_payments}</p>
                                        <p className="text-blue-600">Failed</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* User Stats */}
                        <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                            <div className="bg-blue-900 px-4 py-3 border-b border-blue-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-white uppercase tracking-wide">Users</span>
                                    <span className="text-xs text-blue-200">Total</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="text-2xl font-bold text-blue-900 mb-1 font-mono">{userStats.total}</h3>
                                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                                    <div className="border border-blue-100 rounded-lg p-2 shadow-[0_2px_8px_rgba(30,58,138,0.1)]">
                                        <p className="font-semibold text-blue-900">{userStats.customers}</p>
                                        <p className="text-blue-600">Customers</p>
                                    </div>
                                    <div className="border border-blue-100 rounded-lg p-2 shadow-[0_2px_8px_rgba(30,58,138,0.1)]">
                                        <p className="font-semibold text-blue-900">{userStats.staff}</p>
                                        <p className="text-blue-600">Staff</p>
                                    </div>
                                    <div className="border border-blue-100 rounded-lg p-2 shadow-[0_2px_8px_rgba(30,58,138,0.1)]">
                                        <p className="font-semibold text-blue-900">{userStats.admins}</p>
                                        <p className="text-blue-600">Admins</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Completion Rate */}
                        <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                            <div className="bg-blue-900 px-4 py-3 border-b border-blue-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-white uppercase tracking-wide">Completion</span>
                                    <span className="text-xs text-blue-200">Rate</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="text-2xl font-bold text-blue-900 mb-1 font-mono">
                                    {bookingStats.total > 0 
                                        ? Math.round((bookingStats.completed / bookingStats.total) * 100) 
                                        : 0}%
                                </h3>
                                <div className="w-full bg-blue-100 rounded h-2 mt-3">
                                    <div 
                                        className="bg-blue-900 h-2 rounded" 
                                        style={{ width: `${bookingStats.total > 0 ? (bookingStats.completed / bookingStats.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Bookings - Professional Enterprise Style */}
                    <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                        <div className="bg-blue-900 px-6 py-4 border-b border-blue-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Recent Bookings</h3>
                                <span className="text-xs text-blue-200">Last 10 Records</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-blue-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider border-b border-blue-200">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider border-b border-blue-200">Services</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider border-b border-blue-200">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider border-b border-blue-200">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider border-b border-blue-200">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-blue-100">
                                    {recentBookings.length > 0 ? (
                                        recentBookings.map((booking, index) => (
                                            <tr key={booking.id} className="hover:bg-blue-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900 font-medium">
                                                    {booking.customer_first_name} {booking.customer_last_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">
                                                    {booking.services}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-mono">
                                                    {booking.date}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold uppercase tracking-wide border ${
                                                        booking.status === 'completed' ? 'border-green-600 text-green-700 bg-green-50' :
                                                        booking.status === 'accepted' ? 'border-blue-600 text-blue-700 bg-blue-50' :
                                                        booking.status === 'rejected' ? 'border-red-600 text-red-700 bg-red-50' :
                                                        'border-amber-600 text-amber-700 bg-amber-50'
                                                    }`}>
                                                        {booking.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {booking.rating ? <StarRating rating={booking.rating} /> : 'N/A'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-sm text-blue-600">
                                                No bookings available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top Services - Professional Enterprise Style */}
                    <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                        <div className="bg-blue-900 px-6 py-4 border-b border-blue-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Service Performance</h3>
                                <span className="text-xs text-blue-200">By Average Rating</span>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {topServices.length > 0 ? (
                                    topServices.map((service, index) => (
                                        <div key={index} className="border border-blue-100 rounded-lg p-4 shadow-[0_2px_8px_rgba(30,58,138,0.1)]">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center">
                                                    <span className="text-sm font-bold text-blue-900 mr-3 font-mono">{index + 1}.</span>
                                                    <div>
                                                        <p className="text-sm font-semibold text-blue-900">{service.name}</p>
                                                        <p className="text-xs text-blue-600 font-mono">₱{service.price}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <StarRating rating={service.avg_rating} />
                                                    </div>
                                                    <p className="text-xs text-blue-600 mt-1">avg rating</p>
                                                </div>
                                            </div>
                                            <div className="w-full bg-blue-100 rounded h-2">
                                                <div 
                                                    className="bg-blue-900 h-2 rounded" 
                                                    style={{ width: `${Math.min((service.avg_rating / 5) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between mt-2 text-xs">
                                                <span className="text-blue-700 font-mono">{service.bookings_count} bookings</span>
                                                <span className="text-blue-900 font-semibold font-mono">
                                                    Revenue: ₱{service.revenue.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-sm text-blue-600">
                                        No services data available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Top Customers - Professional Enterprise Style */}
                    <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                        <div className="bg-blue-900 px-6 py-4 border-b border-blue-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Top Customers</h3>
                                <span className="text-xs text-blue-200">By Booking Count</span>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-blue-200">
                                            <th className="text-left py-2 px-4 text-xs font-semibold text-blue-900 uppercase tracking-wider">Customer</th>
                                            <th className="text-left py-2 px-4 text-xs font-semibold text-blue-900 uppercase tracking-wider">Bookings</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topCustomers && topCustomers.length > 0 ? (
                                            topCustomers.map((customer, index) => (
                                                <tr key={index} className="border-b border-blue-100">
                                                    <td className="py-2 px-4 text-sm text-blue-900 font-medium">
                                                        <span className="text-xs font-bold text-blue-600 mr-2">{index + 1}.</span>
                                                        {customer.first_name} {customer.last_name}
                                                    </td>
                                                    <td className="py-2 px-4 text-sm text-blue-700 font-mono">{customer.booking_count}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="2" className="px-6 py-8 text-center text-sm text-blue-600">
                                                    No customer data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Chart - Professional Enterprise Style */}
                    <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                        <div className="bg-blue-900 px-6 py-4 border-b border-blue-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Revenue Analysis</h3>
                                <span className="text-xs text-blue-200">6-Month Period</span>
                            </div>
                        </div>
                        <div className="p-6">
                            {revenueChartData.length > 0 ? (
                                <div className="h-64">
                                    <svg viewBox="0 0 700 250" className="w-full h-full">
                                        {/* Background grid */}
                                        <rect x="60" y="30" width="600" height="180" fill="#EFF6FF" />
                                        
                                        {/* Horizontal grid lines */}
                                        {[0, 1, 2, 3, 4].map((i) => {
                                            const y = 210 - (i * 45);
                                            return (
                                                <line key={i} x1="60" y1={y} x2="660" y2={y} stroke="#BFDBFE" strokeWidth="1" />
                                            );
                                        })}
                                        
                                        {/* Y-axis labels */}
                                        {[0, 1, 2, 3, 4].map((i) => {
                                            const y = 214 - (i * 45);
                                            const maxValue = Math.max(...revenueChartData.map(d => d.value));
                                            const value = Math.round((maxValue * i) / 4);
                                            return (
                                                <text key={i} x="50" y={y} textAnchor="end" className="text-xs fill-blue-600 font-mono">
                                                    ₱{value.toLocaleString()}
                                                </text>
                                            );
                                        })}
                                        
                                        {/* Bars with solid professional colors */}
                                        {revenueChartData.map((data, index) => {
                                            const maxValue = Math.max(...revenueChartData.map(d => d.value));
                                            const barHeight = (data.value / maxValue) * 180;
                                            const x = 80 + (index * 95);
                                            return (
                                                <g key={index}>
                                                    <rect
                                                        x={x}
                                                        y={210 - barHeight}
                                                        width="60"
                                                        height={barHeight}
                                                        fill="#1E3A8A"
                                                        className="hover:fill-blue-800 cursor-pointer"
                                                    />
                                                    <text
                                                        x={x + 30}
                                                        y={230}
                                                        textAnchor="middle"
                                                        className="text-xs fill-blue-700 font-medium"
                                                    >
                                                        {data.label}
                                                    </text>
                                                    <text
                                                        x={x + 30}
                                                        y={205 - barHeight}
                                                        textAnchor="middle"
                                                        className="text-xs fill-blue-900 font-semibold"
                                                    >
                                                        ₱{(data.value / 1000).toFixed(1)}k
                                                    </text>
                                                </g>
                                            );
                                        })}
                                        
                                        {/* Axes */}
                                        <line x1="60" y1="30" x2="60" y2="210" stroke="#1E40AF" strokeWidth="2" />
                                        <line x1="60" y1="210" x2="660" y2="210" stroke="#1E40AF" strokeWidth="2" />
                                        
                                        {/* Y-axis label */}
                                        <text x="25" y="120" textAnchor="middle" transform="rotate(-90 25 120)" className="text-xs fill-blue-700 font-medium">
                                            Revenue (₱)
                                        </text>
                                    </svg>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-sm text-blue-600">No revenue data available</p>
                                </div>
                            )}
                        </div>
                    </div>



                    {/* Gantt Chart - Professional Enterprise Style */}
                    <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                        <div className="bg-blue-900 px-6 py-4 border-b border-blue-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Booking Timeline</h3>
                                <span className="text-xs text-blue-200">30-Day Overview</span>
                            </div>
                        </div>
                        <div className="p-6">
                            {ganttData.length > 0 ? (
                                <div className="h-64 overflow-x-auto">
                                    <svg viewBox="0 0 1400 280" className="w-full h-full min-w-[900px]">
                                        {/* Background grid */}
                                        <rect x="120" y="40" width="1200" height="200" fill="#EFF6FF" />
                                        
                                        {/* Vertical grid lines and dates */}
                                        {ganttData.slice(0, 20).map((data, index) => {
                                            const x = 120 + (index * 58);
                                            return (
                                                <g key={index}>
                                                    <line
                                                        x1={x}
                                                        y1="40"
                                                        x2={x}
                                                        y2="240"
                                                        stroke="#BFDBFE"
                                                        strokeWidth="1"
                                                    />
                                                    <text
                                                        x={x + 29}
                                                        y="260"
                                                        textAnchor="middle"
                                                        className="text-xs fill-blue-600 font-mono"
                                                    >
                                                        {new Date(data.date).getDate()}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                        
                                        {/* Y-axis line */}
                                        <line x1="120" y1="40" x2="120" y2="240" stroke="#1E40AF" strokeWidth="2" />
                                        
                                        {/* X-axis line */}
                                        <line x1="120" y1="240" x2="1320" y2="240" stroke="#1E40AF" strokeWidth="2" />
                                        
                                        {/* Status rows with professional colors */}
                                        {['pending', 'accepted', 'completed', 'rejected'].map((status, statusIndex) => {
                                            const y = 60 + (statusIndex * 45);
                                            const statusColors = {
                                                pending: '#F59E0B',
                                                accepted: '#3B82F6',
                                                completed: '#10B981',
                                                rejected: '#EF4444'
                                            };
                                            return (
                                                <g key={status}>
                                                    <text
                                                        x="10"
                                                        y={y + 14}
                                                        className="text-xs fill-blue-900 font-medium uppercase tracking-wide"
                                                    >
                                                        {status}
                                                    </text>
                                                    {ganttData.slice(0, 20).map((data, index) => {
                                                        const count = data[status] || 0;
                                                        if (count === 0) return null;
                                                        const x = 120 + (index * 58);
                                                        const barWidth = Math.min(count * 8, 45);
                                                        return (
                                                            <rect
                                                                key={index}
                                                                x={x + 5}
                                                                y={y}
                                                                width={barWidth}
                                                                height="28"
                                                                fill={statusColors[status]}
                                                                className="hover:opacity-80 cursor-pointer"
                                                            />
                                                        );
                                                    })}
                                                </g>
                                            );
                                        })}
                                        
                                        {/* Legend */}
                                        <g transform="translate(1100, 50)">
                                            <text x="0" y="0" className="text-xs fill-blue-700 font-medium uppercase tracking-wide">Legend</text>
                                            {['pending', 'accepted', 'completed', 'rejected'].map((status, index) => {
                                                const y = 20 + (index * 22);
                                                const statusColors = {
                                                    pending: '#F59E0B',
                                                    accepted: '#3B82F6',
                                                    completed: '#10B981',
                                                    rejected: '#EF4444'
                                                };
                                                return (
                                                    <g key={status} transform={`translate(0, ${y})`}>
                                                        <rect width="14" height="14" fill={statusColors[status]} />
                                                        <text x="20" y="11" className="text-xs fill-blue-800 capitalize">
                                                            {status}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    </svg>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-sm text-blue-600">No booking data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
