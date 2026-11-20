import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
  TrendingUp, Users, Calendar, DollarSign,
  CheckCircle, Clock, AlertCircle, Car,
  Star, ArrowUp, ArrowDown, Activity,
  Award, ShoppingCart, BarChart3,
  Filter, X, Monitor, Play, Check, User,
  Maximize, Minimize
} from 'lucide-react';

export default function Dashboard({ auth, bookingStats, paymentStats, userStats, recentBookings, topServices, monthlyRevenue, dailyBookings, topCustomers, queueData: initialQueueData, filters }) {
    const [startDate, setStartDate] = useState(filters?.start_date || '');
    const [endDate, setEndDate] = useState(filters?.end_date || '');
    const [isQueueFullscreen, setIsQueueFullscreen] = useState(false);
    const [queueData, setQueueData] = useState(initialQueueData || []);

    useEffect(() => {
        let isMounted = true;
        let timeoutId;

        const refreshQueue = async () => {
            try {
                const response = await fetch(route('admin.queue.display'), {
                    headers: { Accept: 'application/json' },
                    cache: 'no-store',
                });
                if (!response.ok) {
                    throw new Error(`Queue refresh failed with status ${response.status}`);
                }

                const updatedQueue = await response.json();
                if (!Array.isArray(updatedQueue)) {
                    throw new Error('Queue refresh returned invalid data');
                }

                if (isMounted) {
                    setQueueData(updatedQueue);
                }
            } catch (error) {
                if (isMounted) {
                    console.error('Unable to refresh queue display:', error);
                }
            } finally {
                if (isMounted) {
                    timeoutId = window.setTimeout(refreshQueue, 5000);
                }
            }
        };

        refreshQueue();

        return () => {
            isMounted = false;
            window.clearTimeout(timeoutId);
        };
    }, []);

    const toggleQueueFullscreen = () => {
        setIsQueueFullscreen(!isQueueFullscreen);
    };

    const StarRating = ({ rating, max = 5 }) => {
        const stars = [];
        for (let i = 1; i <= max; i++) {
            if (i <= rating) {
                stars.push(<span key={`star-full-${i}`} className="text-yellow-400">★</span>);
            } else if (i - 0.5 <= rating) {
                stars.push(<span key={`star-half-${i}`} className="text-yellow-400">★</span>);
            } else {
                stars.push(<span key={`star-empty-${i}`} className="text-gray-300">★</span>);
            }
        }
        return <span className="flex">{stars}</span>;
    };

    const formatCurrency = (value) => {
        return `₱${Number(value || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
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
        { label: 'Customers', value: userStats.customers, color: '#8B5CF6', icon: Users },
        { label: 'Staff', value: userStats.staff, color: '#3B82F6', icon: Users },
        { label: 'Admins', value: userStats.admins, color: '#6B7280', icon: Users }
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

    const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, trendUp }) => (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-900 mb-1">{value}</h3>
                    {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={24} className="text-white" />
                </div>
            </div>
            {trend && (
                <div className={`flex items-center gap-1 mt-4 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {trendUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    <span>{trend}</span>
                </div>
            )}
        </div>
    );

    return (
        <>
            <AuthenticatedLayout
                user={auth.user}
                header={
                    !isQueueFullscreen && (
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Calendar size={16} />
                                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                        </div>
                    )
                }
                hideLayout={isQueueFullscreen}
            >
                <Head title="Admin Dashboard" />

                <div className={`space-y-6 py-6 px-6 ${isQueueFullscreen ? 'hidden' : ''} overflow-auto`}>
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {auth.user.name}! 👋</h2>
                        <p className="text-indigo-100 text-lg">Here's what's happening with your car service business today.</p>
                    </div>
                </div>

                {/* Date Filter */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={applyFilters}
                                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-lg shadow-indigo-200 flex items-center gap-2"
                            >
                                <Filter size={16} /> Apply Filter
                            </button>
                            <button
                                onClick={clearFilters}
                                className="px-6 py-2.5 bg-white text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all duration-200 flex items-center gap-2"
                            >
                                <X size={16} /> Clear
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Bookings"
                        value={bookingStats.total}
                        subtitle={`${bookingStats.completed} completed`}
                        icon={Calendar}
                        color="bg-gradient-to-br from-blue-500 to-blue-600"
                        trend="All time"
                        trendUp={true}
                    />
                    <StatCard
                        title="Total Revenue"
                        value={formatCurrency(paymentStats.total_revenue)}
                        icon={TrendingUp}
                        color="bg-gradient-to-br from-emerald-500 to-emerald-600"
                        trend="Total revenue"
                        trendUp={true}
                    />
                    <StatCard
                        title="Total Users"
                        value={userStats.total}
                        subtitle={`${userStats.customers} customers`}
                        icon={Users}
                        color="bg-gradient-to-br from-purple-500 to-purple-600"
                        trend="Active users"
                        trendUp={true}
                    />
                    <StatCard
                        title="Completion Rate"
                        value={`${bookingStats.total > 0 ? Math.round((bookingStats.completed / bookingStats.total) * 100) : 0}%`}
                        subtitle={`${bookingStats.total} total bookings`}
                        icon={Activity}
                        color="bg-gradient-to-br from-amber-500 to-orange-500"
                        trend="Success rate"
                        trendUp={true}
                    />
                </div>

                {/* Recent Bookings & Top Services */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Bookings */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Calendar size={20} className="text-indigo-600" />
                                    Recent Bookings
                                </h3>
                                <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm">
                                    Last 10
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Services</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {recentBookings.length > 0 ? (
                                        recentBookings.map((booking) => (
                                            <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                                                    {booking.customer_first_name} {booking.customer_last_name}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                                                    {booking.services}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                                                    {booking.date}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                                                        booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                        booking.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                                        booking.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {booking.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    {booking.rating ? <StarRating rating={booking.rating} /> : <span className="text-slate-400">No ratings</span>}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-12 text-center text-sm text-slate-500">
                                                No bookings available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top Services */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Award size={20} className="text-amber-600" />
                                    Top Services
                                </h3>
                                <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm">
                                    By Rating
                                </span>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {topServices.length > 0 ? (
                                topServices.map((service, index) => (
                                    <div key={service.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500' : index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' : 'bg-gradient-to-br from-orange-300 to-orange-400'}`}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{service.name}</p>
                                                <p className="text-xs text-slate-500">{service.bookings_count} bookings</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Star size={14} className="text-yellow-400 fill-current" />
                                                <span className="font-bold text-slate-900">{service.avg_rating?.toFixed(1) || '0'}</span>
                                            </div>
                                            <p className="text-xs text-slate-500">{formatCurrency(service.revenue || 0)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-500">
                                    <Award size={32} className="mx-auto mb-2 text-slate-300" />
                                    <p>No services data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Customers */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <ShoppingCart size={20} className="text-emerald-600" />
                                Top Customers
                            </h3>
                            <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm">
                                By Bookings
                            </span>
                        </div>
                    </div>
                    <div className="p-6">
                        {topCustomers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {topCustomers.map((customer, index) => (
                                    <div key={customer.id} className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100 hover:shadow-md transition-all">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : index === 1 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500'}`}>
                                                {customer.first_name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{customer.first_name} {customer.last_name}</p>
                                                <p className="text-xs text-slate-500">{customer.booking_count} bookings</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <ShoppingCart size={32} className="mx-auto mb-2 text-slate-300" />
                                <p>No customer data available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Monthly Revenue Chart */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <BarChart3 size={20} className="text-indigo-600" />
                                Monthly Revenue
                            </h3>
                            <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm">
                                Last 6 Months
                            </span>
                        </div>
                    </div>
                    <div className="p-6">
                        {revenueChartData.length > 0 ? (
                            <div className="relative h-64">
                                <svg
                                    viewBox="0 0 800 250"
                                    className="w-full h-full"
                                    preserveAspectRatio="none"
                                >
                                    {/* Grid lines */}
                                    {[0, 25, 50, 75, 100].map((percent) => (
                                        <line
                                            key={percent}
                                            x1="50"
                                            y1={250 - (percent * 2)}
                                            x2="750"
                                            y2={250 - (percent * 2)}
                                            stroke="#e2e8f0"
                                            strokeWidth="1"
                                        />
                                    ))}
                                    
                                    {/* Revenue line */}
                                    <polyline
                                        fill="none"
                                        stroke="#6366f1"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        points={revenueChartData.map((item, index) => {
                                            const x = 50 + (index * 140);
                                            const maxValue = Math.max(...revenueChartData.map(d => d.value));
                                            const y = 250 - ((item.value / maxValue) * 200);
                                            return `${x},${y}`;
                                        }).join(' ')}
                                    />
                                    
                                    {/* Data points */}
                                    {revenueChartData.map((item, index) => {
                                        const x = 50 + (index * 140);
                                        const maxValue = Math.max(...revenueChartData.map(d => d.value));
                                        const y = 250 - ((item.value / maxValue) * 200);
                                        return (
                                            <g key={`point-${item.label}-${index}`}>
                                                <circle
                                                    cx={x}
                                                    cy={y}
                                                    r="6"
                                                    fill="#6366f1"
                                                    stroke="white"
                                                    strokeWidth="2"
                                                />
                                                <text
                                                    x={x}
                                                    y={y - 15}
                                                    textAnchor="middle"
                                                    className="text-xs font-semibold"
                                                    fill="#6366f1"
                                                >
                                                    {formatCurrency(item.value)}
                                                </text>
                                            </g>
                                        );
                                    })}
                                    
                                    {/* X-axis labels */}
                                    {revenueChartData.map((item, index) => (
                                        <text
                                            key={`label-${item.label}-${index}`}
                                            x={50 + (index * 140)}
                                            y={240}
                                            textAnchor="middle"
                                            className="text-xs text-slate-600"
                                        >
                                            {item.label}
                                        </text>
                                    ))}
                                </svg>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <BarChart3 size={32} className="mx-auto mb-2 text-slate-300" />
                                <p>No revenue data available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Queue Projection Toggle Button */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-indigo-500 p-3">
                                <Monitor size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Queue Display</h3>
                                <p className="text-sm text-slate-500">Real-time queue status projection</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleQueueFullscreen}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-lg shadow-indigo-200"
                        >
                            <Maximize size={18} />
                            Open Fullscreen
                        </button>
                    </div>
                </div>
            </div>
            </AuthenticatedLayout>

            {/* Fullscreen Queue - Outside Layout */}
            {isQueueFullscreen && (
                <div className="fixed inset-0 z-[9999] overflow-auto bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.3),transparent_50%)]"></div>
                    </div>

                    <div className="relative p-8 min-h-screen">
                        {/* Header */}
                        <div className="mb-8 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 animate-pulse rounded-2xl bg-indigo-500 blur-xl opacity-50"></div>
                                    <div className="relative rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-4 shadow-lg">
                                        <Monitor size={32} className="text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                                        Queue Display
                                    </h2>
                                    <p className="text-sm text-indigo-300/80">Real-time queue status</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 backdrop-blur-sm">
                                    <Clock size={18} className="text-indigo-400" />
                                    <span className="text-sm font-semibold text-white">{new Date().toLocaleTimeString()}</span>
                                </div>
                                <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 backdrop-blur-sm">
                                    <Calendar size={18} className="text-indigo-400" />
                                    <span className="text-sm font-semibold text-white">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                                </div>
                                <button
                                    onClick={toggleQueueFullscreen}
                                    className="flex items-center gap-2 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 px-5 py-3 backdrop-blur-sm transition-all hover:bg-indigo-500/30 hover:scale-105"
                                >
                                    <Minimize size={18} className="text-indigo-400" />
                                    <span className="text-sm font-semibold text-indigo-300">Exit Fullscreen</span>
                                </button>
                            </div>
                        </div>

                        {/* Queue Stats */}
                        {queueData && queueData.length > 0 && (
                            <div className="mb-6 grid grid-cols-3 gap-4">
                                <div className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30 p-4 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 text-indigo-300">
                                        <Users size={16} />
                                        <span className="text-xs font-medium uppercase tracking-wider">Total</span>
                                    </div>
                                    <p className="mt-2 text-2xl font-bold text-white">{queueData.length}</p>
                                </div>
                                <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 p-4 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 text-amber-300">
                                        <Play size={16} className="fill-current" />
                                        <span className="text-xs font-medium uppercase tracking-wider">Serving</span>
                                    </div>
                                    <p className="mt-2 text-2xl font-bold text-white">{queueData.filter(q => q.status === 'in_progress').length}</p>
                                </div>
                                <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 p-4 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 text-emerald-300">
                                        <Check size={16} className="fill-current" />
                                        <span className="text-xs font-medium uppercase tracking-wider">Completed</span>
                                    </div>
                                    <p className="mt-2 text-2xl font-bold text-white">{queueData.filter(q => q.status === 'completed').length}</p>
                                </div>
                            </div>
                        )}

                        {/* Queue List - Kanban Style */}
                        {queueData && queueData.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                {/* Waiting Column */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 p-4">
                                        <div className="rounded-xl bg-indigo-500 p-2">
                                            <Clock size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Waiting</h3>
                                            <p className="text-xs text-indigo-300">{queueData.filter(q => q.status === 'pending').length} queues</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {queueData.filter(q => q.status === 'pending').map((queue) => (
                                            <div
                                                key={queue.id}
                                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-indigo-500/30"
                                            >
                                                <div className="relative p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-black text-white shadow-lg shadow-indigo-500/30">
                                                            {queue.queue_number}
                                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-base font-bold text-white truncate">{queue.service_name}</h4>
                                                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                                                <div className="flex items-center gap-1">
                                                                    <User size={12} className="text-indigo-400" />
                                                                    <span className="truncate">{queue.customer_name}</span>
                                                                </div>
                                                            </div>
                                                            {queue.staff_names && queue.staff_names.length > 0 && (
                                                                <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                                                    <Users size={12} className="text-indigo-400" />
                                                                    <span className="truncate">{queue.staff_names.join(', ')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {queue.priority > 0 && (
                                                            <div className="relative flex-shrink-0">
                                                                <div className="absolute inset-0 rounded-lg bg-rose-500 blur-lg opacity-50"></div>
                                                                <div className="relative rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                                                                    P{queue.priority}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {queueData.filter(q => q.status === 'pending').length === 0 && (
                                            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                                                <p className="text-sm text-slate-500">No waiting queues</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Serving Column */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4">
                                        <div className="rounded-xl bg-amber-500 p-2">
                                            <Play size={20} className="text-white fill-current" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Serving</h3>
                                            <p className="text-xs text-amber-300">{queueData.filter(q => q.status === 'in_progress').length} queues</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {queueData.filter(q => q.status === 'in_progress').map((queue) => (
                                            <div
                                                key={queue.id}
                                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/20"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent opacity-50"></div>
                                                <div className="relative p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-xl font-black text-white shadow-lg shadow-amber-500/30 animate-pulse">
                                                            {queue.queue_number}
                                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-base font-bold text-white truncate">{queue.service_name}</h4>
                                                                <span className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                                                    Active
                                                                </span>
                                                            </div>
                                                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                                                <div className="flex items-center gap-1">
                                                                    <User size={12} className="text-amber-400" />
                                                                    <span className="truncate">{queue.customer_name}</span>
                                                                </div>
                                                            </div>
                                                            {queue.staff_names && queue.staff_names.length > 0 && (
                                                                <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                                                    <Users size={12} className="text-amber-400" />
                                                                    <span className="truncate">{queue.staff_names.join(', ')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {queue.priority > 0 && (
                                                            <div className="relative flex-shrink-0">
                                                                <div className="absolute inset-0 rounded-lg bg-rose-500 blur-lg opacity-50"></div>
                                                                <div className="relative rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                                                                    P{queue.priority}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {queueData.filter(q => q.status === 'in_progress').length === 0 && (
                                            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                                                <p className="text-sm text-slate-500">No queues being served</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Completed Column */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                                        <div className="rounded-xl bg-emerald-500 p-2">
                                            <Check size={20} className="text-white fill-current" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Completed</h3>
                                            <p className="text-xs text-emerald-300">{queueData.filter(q => q.status === 'completed').length} queues</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {queueData.filter(q => q.status === 'completed').map((queue) => (
                                            <div
                                                key={queue.id}
                                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                                            >
                                                <div className="relative p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-xl font-black text-white shadow-lg shadow-emerald-500/30">
                                                            {queue.queue_number}
                                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-base font-bold text-white truncate">{queue.service_name}</h4>
                                                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                                                <div className="flex items-center gap-1">
                                                                    <User size={12} className="text-emerald-400" />
                                                                    <span className="truncate">{queue.customer_name}</span>
                                                                </div>
                                                            </div>
                                                            {queue.staff_names && queue.staff_names.length > 0 && (
                                                                <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                                                    <Users size={12} className="text-emerald-400" />
                                                                    <span className="truncate">{queue.staff_names.join(', ')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {queue.priority > 0 && (
                                                            <div className="relative flex-shrink-0">
                                                                <div className="absolute inset-0 rounded-lg bg-rose-500 blur-lg opacity-50"></div>
                                                                <div className="relative rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                                                                    P{queue.priority}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {queueData.filter(q => q.status === 'completed').length === 0 && (
                                            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                                                <p className="text-sm text-slate-500">No completed queues</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 animate-pulse rounded-full bg-indigo-500 blur-3xl opacity-20"></div>
                                    <div className="relative rounded-3xl bg-white/5 border border-white/10 p-8 backdrop-blur-sm">
                                        <Monitor size={64} className="text-indigo-400" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">No Active Queues</h3>
                                <p className="text-slate-400">Queue entries will appear here when services are assigned</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
