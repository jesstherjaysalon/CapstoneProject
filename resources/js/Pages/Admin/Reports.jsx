import { useState, useEffect, useRef, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Banknote, Calendar, Package, Users, ClipboardList, TrendingUp, AlertTriangle, Star, RefreshCw } from 'lucide-react';

const COLORS = ['#0D2A94', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

// Format date to month name and day (e.g., "January 15")
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};

const formatOverviewDate = (dateString, options) => {
    if (!dateString) return '—';
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', options);
};

const bookingStatusColors = {
    accepted: '#10B981',
    cancelled: '#EF4444',
    completed: '#0D2A94',
    pending: '#F59E0B',
    rejected: '#9CA3AF',
};
const bookingStatusClasses = {
    accepted: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-700',
    completed: 'bg-blue-50 text-blue-700',
    pending: 'bg-amber-50 text-amber-700',
    rejected: 'bg-gray-100 text-gray-700',
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
    const [loadingSections, setLoadingSections] = useState({ overview: true });
    const [requestErrors, setRequestErrors] = useState({});
    const [financialStartDate, setFinancialStartDate] = useState('');
    const [financialEndDate, setFinancialEndDate] = useState('');
    const [filterError, setFilterError] = useState('');
    const [jobOrderSalesPage, setJobOrderSalesPage] = useState(1);
    const [customerSalesPage, setCustomerSalesPage] = useState(1);
    const requestControllers = useRef({});
    const [data, setData] = useState({
        overview: null,
        financial: null,
        consumableProductSales: null,
        jobOrders: null,
        inventory: null,
    });

    useEffect(() => {
        fetchOverviewData();
    }, []);

    const requestReport = async (key, url) => {
        requestControllers.current[key]?.abort();
        const controller = new AbortController();
        requestControllers.current[key] = controller;
        setLoadingSections(prev => ({ ...prev, [key]: true }));
        setRequestErrors(prev => ({ ...prev, [key]: '' }));

        try {
            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`The report request failed (${response.status}).`);
            }

            const result = await response.json();
            setData(prev => ({ ...prev, [key]: result }));
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error(`Error fetching ${key} report:`, error);
                const message = error instanceof SyntaxError
                    ? 'The server returned an invalid response. Please retry or contact support.'
                    : error.message || 'Unable to load this report.';
                setRequestErrors(prev => ({ ...prev, [key]: message }));
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoadingSections(prev => ({ ...prev, [key]: false }));
            }
        }
    };

    const buildDateRangeUrl = (endpoint, startDate, endDate) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const query = params.toString();
        return query ? `${endpoint}?${query}` : endpoint;
    };

    const fetchOverviewData = async () => {
        await requestReport('overview', '/admin/reports/overview');
    };

    const fetchFinancialData = async (startDate = financialStartDate, endDate = financialEndDate) => {
        await requestReport('financial', buildDateRangeUrl('/admin/reports/financial', startDate, endDate));
    };

    const fetchConsumableProductSales = async (startDate = financialStartDate, endDate = financialEndDate) => {
        await requestReport('consumableProductSales', buildDateRangeUrl('/admin/reports/consumable-product-sales', startDate, endDate));
    };

    const applyFinancialFilters = () => {
        if (Boolean(financialStartDate) !== Boolean(financialEndDate)) {
            setFilterError('Choose both a start and end date, or clear both to use the default period.');
            return;
        }
        if (financialStartDate && financialEndDate < financialStartDate) {
            setFilterError('The end date must be on or after the start date.');
            return;
        }
        setFilterError('');
        fetchFinancialData(financialStartDate, financialEndDate);
        fetchConsumableProductSales(financialStartDate, financialEndDate);
    };

    const resetFinancialFilters = () => {
        setFinancialStartDate('');
        setFinancialEndDate('');
        setFilterError('');
        fetchFinancialData('', '');
        fetchConsumableProductSales('', '');
    };

    const fetchJobOrdersData = async () => {
        await requestReport('jobOrders', '/admin/reports/job-orders');
    };

    const fetchInventoryData = async () => {
        await requestReport('inventory', '/admin/reports/inventory');
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        switch (tab) {
            case 'financial':
                fetchFinancialData(financialStartDate, financialEndDate);
                fetchConsumableProductSales(financialStartDate, financialEndDate);
                break;
            case 'jobOrders':
                if (!data.jobOrders) fetchJobOrdersData();
                break;
            case 'inventory':
                if (!data.inventory) fetchInventoryData();
                break;
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'financial', label: 'Financial', icon: Banknote },
        { id: 'jobOrders', label: 'Job Orders', icon: ClipboardList },
        { id: 'inventory', label: 'Inventory', icon: Package },
    ];
    const activeRequestKeys = activeTab === 'financial'
        ? ['financial', 'consumableProductSales']
        : [activeTab];
    const activeDataKey = activeTab === 'jobOrders' ? 'jobOrders' : activeTab;
    const activeLoading = activeRequestKeys.some(key => loadingSections[key]);
    const activeErrors = activeRequestKeys.filter(key => requestErrors[key]);
    const jobOrderSales = data.jobOrders?.job_order_history || [];
    const jobOrderSalesTotals = jobOrderSales.reduce((totals, jobOrder) => ({
        service: totals.service + Number(jobOrder.service_sales || 0),
        products: totals.products + Number(jobOrder.product_sales || 0),
        total: totals.total + Number(jobOrder.total_sales || 0),
    }), { service: 0, products: 0, total: 0 });
    const jobOrderSalesPageSize = 10;
    const jobOrderSalesPageCount = Math.max(1, Math.ceil(jobOrderSales.length / jobOrderSalesPageSize));
    const currentJobOrderSalesPage = Math.min(jobOrderSalesPage, jobOrderSalesPageCount);
    const visibleJobOrderSales = jobOrderSales.slice(
        (currentJobOrderSalesPage - 1) * jobOrderSalesPageSize,
        currentJobOrderSalesPage * jobOrderSalesPageSize
    );
    const customerSales = useMemo(() => {
        const salesByCustomer = new Map();

        jobOrderSales.forEach((jobOrder) => {
            if (Number(jobOrder.total_sales || 0) <= 0) return;

            const customerKey = jobOrder.customer_id
                ? `profile-${jobOrder.customer_id}`
                : `booking-${jobOrder.booking_id || jobOrder.id}`;
            const customer = salesByCustomer.get(customerKey) || {
                id: customerKey,
                name: jobOrder.customer_name || 'Guest Customer',
                job_orders: 0,
                service_sales: 0,
                product_sales: 0,
                total_sales: 0,
            };

            customer.job_orders += 1;
            customer.service_sales += Number(jobOrder.service_sales || 0);
            customer.product_sales += Number(jobOrder.product_sales || 0);
            customer.total_sales += Number(jobOrder.total_sales || 0);
            salesByCustomer.set(customerKey, customer);
        });

        return Array.from(salesByCustomer.values())
            .sort((left, right) => right.total_sales - left.total_sales);
    }, [jobOrderSales]);
    const customerSalesTotals = customerSales.reduce((totals, customer) => ({
        jobs: totals.jobs + customer.job_orders,
        service: totals.service + customer.service_sales,
        products: totals.products + customer.product_sales,
        total: totals.total + customer.total_sales,
    }), { jobs: 0, service: 0, products: 0, total: 0 });
    const customerSalesPageSize = 10;
    const customerSalesPageCount = Math.max(1, Math.ceil(customerSales.length / customerSalesPageSize));
    const currentCustomerSalesPage = Math.min(customerSalesPage, customerSalesPageCount);
    const visibleCustomerSales = customerSales.slice(
        (currentCustomerSalesPage - 1) * customerSalesPageSize,
        currentCustomerSalesPage * customerSalesPageSize
    );

    return (
        <AuthenticatedLayout user={auth?.user} header="Reports">
            <Head title="Reports" />
            <div className="space-y-5 pb-8">
                {/* Tab Navigation */}
                <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                                    activeTab === tab.id
                                        ? 'border-blue-700 text-blue-800'
                                        : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
                                }`}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {activeErrors.map(key => (
                    <div key={key} role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
                        <span>{requestErrors[key]}</span>
                        <button
                            onClick={() => activeTab === 'overview' ? fetchOverviewData() : handleTabChange(activeTab)}
                            className="inline-flex items-center gap-2 self-start font-semibold text-red-900 hover:text-red-700 sm:self-auto"
                        >
                            <RefreshCw size={15} /> Retry
                        </button>
                    </div>
                ))}

                {activeLoading && data[activeDataKey] && (
                    <p className="flex items-center gap-2 text-xs font-medium text-gray-500" role="status">
                        <RefreshCw size={14} className="animate-spin" /> Updating report data...
                    </p>
                )}

                {activeLoading && !data[activeDataKey] && activeTab !== 'overview' && (
                    <div className="flex min-h-56 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500" role="status">
                        <span className="flex items-center gap-2"><RefreshCw size={16} className="animate-spin" /> Loading report...</span>
                    </div>
                )}

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {loadingSections.overview ? (
                            <div className="flex min-h-56 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500" role="status">
                                <span className="flex items-center gap-2"><RefreshCw size={16} className="animate-spin" /> Loading overview...</span>
                            </div>
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
                                        value={formatCurrency(data.overview.total_revenue)}
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

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    <StatCard
                                        title="Cancellation Fees"
                                        value={formatCurrency(data.overview.total_cancellation_fees)}
                                        icon={Banknote}
                                        color="yellow"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                                    <div className="lg:col-span-3">
                                        <ChartCard title="Booking Activity" description="Bookings created over the last seven days.">
                                            {data.overview.booking_trend?.length ? (
                                                <ResponsiveContainer width="100%" height={280}>
                                                    <LineChart data={data.overview.booking_trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                                        <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                                                        <XAxis
                                                            dataKey="date"
                                                            tickFormatter={(date) => formatOverviewDate(date, { weekday: 'short' })}
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tick={{ fill: '#6B7280', fontSize: 12 }}
                                                        />
                                                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                                        <Tooltip
                                                            labelFormatter={(date) => formatOverviewDate(date, { month: 'short', day: 'numeric' })}
                                                            contentStyle={{ borderRadius: 10, borderColor: '#E5E7EB' }}
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="bookings"
                                                            name="Bookings"
                                                            stroke="#0D2A94"
                                                            strokeWidth={3}
                                                            dot={{ r: 4, fill: '#0D2A94', strokeWidth: 0 }}
                                                            activeDot={{ r: 6 }}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            ) : <EmptyState message="No booking activity is available." />}
                                        </ChartCard>
                                    </div>
                                    <div className="lg:col-span-2">
                                        <ChartCard title="Booking Status" description="Current distribution across all bookings.">
                                            {data.overview.booking_status_distribution?.length ? (
                                                <ResponsiveContainer width="100%" height={280}>
                                                    <PieChart>
                                                        <Pie
                                                            data={data.overview.booking_status_distribution}
                                                            dataKey="total"
                                                            nameKey="status"
                                                            innerRadius={62}
                                                            outerRadius={92}
                                                            paddingAngle={3}
                                                        >
                                                            {data.overview.booking_status_distribution.map((entry, index) => (
                                                                <Cell
                                                                    key={entry.status}
                                                                    fill={bookingStatusColors[entry.status] || COLORS[index % COLORS.length]}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            formatter={(value, name) => [value, `${name.charAt(0).toUpperCase()}${name.slice(1)}`]}
                                                            contentStyle={{ borderRadius: 10, borderColor: '#E5E7EB' }}
                                                        />
                                                        <Legend
                                                            verticalAlign="bottom"
                                                            formatter={(value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : <EmptyState message="No booking status data is available." />}
                                        </ChartCard>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                    <section className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm lg:col-span-2">
                                        <div className="border-b border-gray-100 px-5 py-4">
                                            <h3 className="text-base font-semibold text-gray-900">Recent Bookings</h3>
                                            <p className="mt-1 text-sm text-gray-500">The latest bookings added to the system.</p>
                                        </div>
                                        {data.overview.recent_bookings?.length ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                                        <tr>
                                                            <th className="px-5 py-3 font-semibold">Booking</th>
                                                            <th className="px-5 py-3 font-semibold">Customer</th>
                                                            <th className="px-5 py-3 font-semibold">Services</th>
                                                            <th className="px-5 py-3 font-semibold">Date</th>
                                                            <th className="px-5 py-3 font-semibold">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {data.overview.recent_bookings.map((booking) => (
                                                            <tr key={booking.id} className="hover:bg-gray-50">
                                                                <td className="whitespace-nowrap px-5 py-3 font-semibold text-gray-700">#{booking.id}</td>
                                                                <td className="whitespace-nowrap px-5 py-3 text-gray-800">{booking.customer_name}</td>
                                                                <td className="max-w-[220px] px-5 py-3 text-gray-600">{booking.services}</td>
                                                                <td className="whitespace-nowrap px-5 py-3 text-gray-600">
                                                                    {formatOverviewDate(booking.date, { month: 'short', day: 'numeric' })}
                                                                </td>
                                                                <td className="whitespace-nowrap px-5 py-3">
                                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${bookingStatusClasses[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                                                                        {booking.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : <div className="p-5"><EmptyState message="No recent bookings are available." /></div>}
                                    </section>

                                    <section className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                                        <div className="border-b border-gray-100 px-5 py-4">
                                            <h3 className="text-base font-semibold text-gray-900">Top Services</h3>
                                            <p className="mt-1 text-sm text-gray-500">Most frequently booked services.</p>
                                        </div>
                                        {data.overview.top_services?.length ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                                        <tr>
                                                            <th className="px-5 py-3 font-semibold">Service</th>
                                                            <th className="px-5 py-3 text-right font-semibold">Bookings</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {data.overview.top_services.map((service, index) => (
                                                            <tr key={`${service.name}-${index}`} className="hover:bg-gray-50">
                                                                <td className="px-5 py-3 font-medium text-gray-800">{service.name}</td>
                                                                <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-gray-700">
                                                                    {service.bookings}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : <div className="p-5"><EmptyState message="No service booking data is available." /></div>}
                                    </section>
                                </div>
                            </>
                        ) : !requestErrors.overview ? (
                            <EmptyState message="No overview data is available." />
                        ) : null}
                    </div>
                )}

                {/* Financial Tab */}
                {activeTab === 'financial' && (
                    <div className="space-y-6">
                        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Financial Filters</h3>
                                    <p className="text-sm text-gray-500">Filter revenue and sales by date range.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Start Date</label>
                                        <input
                                            type="date"
                                            value={financialStartDate}
                                            max={financialEndDate || undefined}
                                            onChange={(e) => { setFinancialStartDate(e.target.value); setFilterError(''); }}
                                            className="w-full rounded-md border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">End Date</label>
                                        <input
                                            type="date"
                                            value={financialEndDate}
                                            min={financialStartDate || undefined}
                                            onChange={(e) => { setFinancialEndDate(e.target.value); setFilterError(''); }}
                                            className="w-full rounded-md border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-600 focus:ring-blue-600"
                                        />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <button
                                            onClick={applyFinancialFilters}
                                            className="rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                        >
                                            Apply
                                        </button>
                                        <button
                                            onClick={resetFinancialFilters}
                                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {filterError && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{filterError}</p>}
                        </div>

                        {data.financial && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                                    <StatCard
                                        title="Total Daily Revenue"
                                        value={formatCurrency(data.financial.total_daily_revenue)}
                                        icon={Banknote}
                                        color="blue"
                                    />
                                    <StatCard
                                        title="Total Product Sales"
                                        value={formatCurrency(data.financial.total_product_sales)}
                                        icon={Package}
                                        color="green"
                                    />
                                    <StatCard
                                        title="Total Revenue by Service"
                                        value={formatCurrency(data.financial.total_revenue_by_service)}
                                        icon={ClipboardList}
                                        color="purple"
                                    />
                                    <StatCard
                                        title="Cancellation Fees"
                                        value={formatCurrency(data.financial.total_cancellation_fees)}
                                        icon={Banknote}
                                        color="yellow"
                                    />
                                    <StatCard
                                        title="Total Unpaid Balance"
                                        value={formatCurrency(data.financial.total_unpaid_balance)}
                                        icon={AlertTriangle}
                                        color="red"
                                    />
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Customers with Balance</h3>
                                        <p className="text-sm text-gray-500">Customers whose bookings still have remaining unpaid balances.</p>
                                    </div>

                                    {Array.isArray(data.financial.unpaid_customers) && data.financial.unpaid_customers.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-200 bg-gray-50">
                                                        <th className="px-4 py-3 font-semibold text-gray-700">Customer</th>
                                                        <th className="px-4 py-3 font-semibold text-gray-700">Booking ID</th>
                                                        <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                                                        <th className="px-4 py-3 font-semibold text-gray-700">Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.financial.unpaid_customers.map((customer, index) => (
                                                        <tr key={`${customer.customer_name}-${customer.booking_id || index}`} className="border-b border-gray-100">
                                                            <td className="px-4 py-3 font-medium text-gray-800">{customer.customer_name}</td>
                                                            <td className="px-4 py-3 text-gray-700">#{customer.booking_id}</td>
                                                            <td className="px-4 py-3 text-gray-700">{customer.date}</td>
                                                            <td className="px-4 py-3 font-semibold text-amber-700">{formatCurrency(customer.balance)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-8 text-gray-500">
                                            No customers currently have an unpaid balance.
                                        </div>
                                    )}
                                </div>

                                <ChartCard title="Daily Revenue Trend: Services, Products, and Cancellation Fees">
                                    {Array.isArray(data.financial.daily_revenue) && data.financial.daily_revenue?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={data.financial.daily_revenue}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" tickFormatter={formatDate} />
                                                <YAxis />
                                                <Tooltip formatter={formatCurrency} labelFormatter={formatDate} />
                                                <Legend />
                                                <Line type="monotone" dataKey="service_total" stroke="#0D2A94" strokeWidth={2} name="Total Revenue by Service" />
                                                <Line type="monotone" dataKey="product_total" stroke="#10B981" strokeWidth={2} name="Total Product Sales" />
                                                <Line type="monotone" dataKey="cancellation_fee_total" stroke="#F59E0B" strokeWidth={2} name="Cancellation Fees" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-gray-500">
                                            No daily revenue data available
                                        </div>
                                    )}
                                </ChartCard>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <ChartCard title="Revenue by Payment Method">
                                        {Array.isArray(data.financial.revenue_by_payment_method) && data.financial.revenue_by_payment_method?.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={data.financial.revenue_by_payment_method}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="payment_method" />
                                                    <YAxis />
                                                    <Tooltip formatter={formatCurrency} />
                                                    <Bar dataKey="total" fill="#0D2A94" radius={[8, 8, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-[300px] text-gray-500">
                                                No payment method data available
                                            </div>
                                        )}
                                    </ChartCard>

                                    <ChartCard title="Payment Method Share">
                                        {Array.isArray(data.financial.revenue_by_payment_method) && data.financial.revenue_by_payment_method?.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie
                                                        data={data.financial.revenue_by_payment_method}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        outerRadius={90}
                                                        dataKey="total"
                                                        nameKey="payment_method"
                                                    >
                                                        {data.financial.revenue_by_payment_method.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={formatCurrency} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-[300px] text-gray-500">
                                                No payment share data available
                                            </div>
                                        )}
                                    </ChartCard>
                                </div>

                                {Array.isArray(data.consumableProductSales) && data.consumableProductSales.length > 0 ? (
                                    <ChartCard title="Consumable Product Sales">
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart data={data.consumableProductSales} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="name" type="category" width={150} />
                                                <Tooltip formatter={formatCurrency} />
                                                <Bar dataKey="total_sales" fill="#F59E0B" radius={[0, 8, 8, 0]} />
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

                                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Detailed Financial Report</h3>
                                        <p className="text-sm text-gray-500">Cancelled bookings contribute only their cancellation fee; their original payments are excluded from sales.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                                        <div className="rounded-xl bg-blue-50 p-4">
                                            <p className="text-sm text-blue-700">Online Revenue</p>
                                            <p className="mt-2 text-2xl font-bold text-blue-900">
                                                {formatCurrency(data.financial.revenue_by_payment_method?.filter(item => item.payment_method !== 'manual' && item.payment_method !== 'cash' && item.payment_method !== 'walkin' && item.payment_method !== 'cancellation fee')
                                                    .reduce((sum, item) => sum + Number(item.total || 0), 0))}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-emerald-50 p-4">
                                            <p className="text-sm text-emerald-700">Manual Revenue</p>
                                            <p className="mt-2 text-2xl font-bold text-emerald-900">
                                                {formatCurrency(data.financial.revenue_by_payment_method?.filter(item => item.payment_method === 'manual' || item.payment_method === 'cash' || item.payment_method === 'walkin')
                                                    .reduce((sum, item) => sum + Number(item.total || 0), 0))}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-amber-50 p-4">
                                            <p className="text-sm text-amber-700">Product Revenue</p>
                                            <p className="mt-2 text-2xl font-bold text-amber-900">
                                                {formatCurrency(data.financial.total_product_sales)}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-yellow-50 p-4">
                                            <p className="text-sm text-yellow-700">Cancellation Fees</p>
                                            <p className="mt-2 text-2xl font-bold text-yellow-900">
                                                {formatCurrency(data.financial.total_cancellation_fees)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200 bg-gray-50">
                                                    <th className="px-4 py-3 font-semibold text-gray-700">Revenue Type</th>
                                                    <th className="px-4 py-3 font-semibold text-gray-700">Amount</th>
                                                    <th className="px-4 py-3 font-semibold text-gray-700">Count</th>
                                                    <th className="px-4 py-3 font-semibold text-gray-700">Share</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(data.financial.revenue_by_payment_method || []).map((item, index) => {
                                                    const totalRevenue = (data.financial.revenue_by_payment_method || []).reduce((sum, entry) => sum + Number(entry.total || 0), 0);
                                                    const share = totalRevenue > 0 ? (Number(item.total || 0) / totalRevenue) * 100 : 0;

                                                    return (
                                                        <tr key={`${item.payment_method}-${index}`} className="border-b border-gray-100">
                                                            <td className="px-4 py-3 font-medium text-gray-800 capitalize">{item.payment_method || 'Unknown'}</td>
                                                            <td className="px-4 py-3 text-gray-700">{formatCurrency(item.total)}</td>
                                                            <td className="px-4 py-3 text-gray-700">{item.count || 0}</td>
                                                            <td className="px-4 py-3 text-gray-700">{share.toFixed(1)}%</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Job Orders Tab */}
                {activeTab === 'jobOrders' && data.jobOrders && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Job Order Status">
                                {data.jobOrders.job_order_status?.length ? <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={data.jobOrders.job_order_status}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            dataKey="count"
                                        >
                                            {data.jobOrders.job_order_status.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer> : <EmptyState message="No job order status data for this period." />}
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
                                                        <td className="py-2 px-4"><StarRating rating={Number(staff.avg_rating)} /></td>
                                                        <td className="py-2 px-4">{staff.completed_jobs}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <EmptyState message="No staff ratings data available." />
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

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <StatCard
                                title="Service Sales"
                                value={formatCurrency(jobOrderSalesTotals.service)}
                                icon={ClipboardList}
                                color="purple"
                            />
                            <StatCard
                                title="Product Sales"
                                value={formatCurrency(jobOrderSalesTotals.products)}
                                icon={Package}
                                color="green"
                            />
                            <StatCard
                                title="Total Job Order Sales"
                                value={formatCurrency(jobOrderSalesTotals.total)}
                                icon={Banknote}
                                color="blue"
                            />
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Detailed Job Order Sales</h3>
                                <p className="text-sm text-gray-500">Sales per job order include the service price and approved product usage. Rejected and cancelled bookings show zero sales.</p>
                            </div>

                            {jobOrderSales.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1450px] text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200 bg-gray-50">
                                                <th className="px-4 py-3 font-semibold text-gray-700">Job Order</th>
                                                <th className="px-4 py-3 font-semibold text-gray-700">Booking</th>
                                                <th className="px-4 py-3 font-semibold text-gray-700">Service</th>
                                                <th className="px-4 py-3 font-semibold text-gray-700">Customer / Vehicle</th>
                                                <th className="px-4 py-3 font-semibold text-gray-700">Staff</th>
                                                <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                                                <th className="px-4 py-3 font-semibold text-gray-700">Approved Products</th>
                                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Service Sales</th>
                                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Product Sales</th>
                                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Sales</th>
                                                <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleJobOrderSales.map((jobOrder) => (
                                                <tr key={jobOrder.id} className="border-b border-gray-100">
                                                    <td className="px-4 py-3 font-medium text-gray-800">#{jobOrder.id}</td>
                                                    <td className="px-4 py-3 text-gray-700">{jobOrder.booking_id ? `#${jobOrder.booking_id}` : '-'}</td>
                                                    <td className="px-4 py-3 text-gray-700">{jobOrder.service_name || 'Unknown service'}</td>
                                                    <td className="px-4 py-3 text-gray-700">
                                                        <div className="font-medium">{jobOrder.customer_name || 'Unknown customer'}</div>
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            {jobOrder.vehicle
                                                                ? `${jobOrder.vehicle.brand || ''} ${jobOrder.vehicle.model || ''} • ${jobOrder.vehicle.plate_number || 'No plate'}`.trim()
                                                                : 'No vehicle'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700">{jobOrder.staff_name || 'Unassigned'}</td>
                                                    <td className="px-4 py-3 text-gray-700">{jobOrder.booking_date || '-'}</td>
                                                    <td className="px-4 py-3 text-gray-700">
                                                        {jobOrder.sales_excluded ? (
                                                            <span className="text-gray-400">Excluded ({jobOrder.booking_status})</span>
                                                        ) : jobOrder.products?.length ? (
                                                            <ul className="space-y-1">
                                                                {jobOrder.products.map((product, index) => (
                                                                    <li key={`${product.name}-${index}`} className="whitespace-nowrap">
                                                                        <span className="font-medium">{product.name}</span>
                                                                        <div className="text-xs text-gray-500">
                                                                            {product.quantity} {product.unit} × {formatCurrency(product.unit_price)} = {formatCurrency(product.total_sales)}
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <span className="text-gray-400">No approved products</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(jobOrder.service_sales)}</td>
                                                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(jobOrder.product_sales)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(jobOrder.total_sales)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 capitalize">
                                                            {jobOrder.status?.replace('_', ' ') || 'Unknown'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                                                <td colSpan={7} className="px-4 py-3 text-gray-800">Total</td>
                                                <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(jobOrderSalesTotals.service)}</td>
                                                <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(jobOrderSalesTotals.products)}</td>
                                                <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(jobOrderSalesTotals.total)}</td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-8 text-gray-500">
                                    No job order sales data is available.
                                </div>
                            )}
                            {jobOrderSales.length > 0 && (
                                <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-gray-500">
                                        Showing {(currentJobOrderSalesPage - 1) * jobOrderSalesPageSize + 1}
                                        {' '}to {Math.min(currentJobOrderSalesPage * jobOrderSalesPageSize, jobOrderSales.length)}
                                        {' '}of {jobOrderSales.length} job orders
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setJobOrderSalesPage(currentJobOrderSalesPage - 1)}
                                            disabled={currentJobOrderSalesPage === 1}
                                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <span className="px-2 text-sm text-gray-600">
                                            Page {currentJobOrderSalesPage} of {jobOrderSalesPageCount}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setJobOrderSalesPage(currentJobOrderSalesPage + 1)}
                                            disabled={currentJobOrderSalesPage === jobOrderSalesPageCount}
                                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Sales by Customer</h3>
                                <p className="text-sm text-gray-500">Customer sales are grouped across job orders and sorted by total sales.</p>
                            </div>
                            {customerSales.length > 0 ? (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[760px] text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200 bg-gray-50">
                                                    <th className="px-4 py-3 font-semibold text-gray-700">Customer</th>
                                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Job Orders</th>
                                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Service Sales</th>
                                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Product Sales</th>
                                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Sales</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {visibleCustomerSales.map((customer) => (
                                                    <tr key={customer.id} className="border-b border-gray-100">
                                                        <td className="px-4 py-3 font-medium text-gray-800">{customer.name}</td>
                                                        <td className="px-4 py-3 text-right text-gray-700">{customer.job_orders}</td>
                                                        <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(customer.service_sales)}</td>
                                                        <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(customer.product_sales)}</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(customer.total_sales)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                                                    <td className="px-4 py-3 text-gray-800">All Customers</td>
                                                    <td className="px-4 py-3 text-right text-gray-800">{customerSalesTotals.jobs}</td>
                                                    <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(customerSalesTotals.service)}</td>
                                                    <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(customerSalesTotals.products)}</td>
                                                    <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(customerSalesTotals.total)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm text-gray-500">
                                            Showing {(currentCustomerSalesPage - 1) * customerSalesPageSize + 1}
                                            {' '}to {Math.min(currentCustomerSalesPage * customerSalesPageSize, customerSales.length)}
                                            {' '}of {customerSales.length} customers
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCustomerSalesPage(currentCustomerSalesPage - 1)}
                                                disabled={currentCustomerSalesPage === 1}
                                                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Previous
                                            </button>
                                            <span className="px-2 text-sm text-gray-600">
                                                Page {currentCustomerSalesPage} of {customerSalesPageCount}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setCustomerSalesPage(currentCustomerSalesPage + 1)}
                                                disabled={currentCustomerSalesPage === customerSalesPageCount}
                                                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <EmptyState message="No customer sales data is available." />
                            )}
                        </div>
                    </div>
                )}

                {/* Inventory Tab */}
                {activeTab === 'inventory' && data.inventory && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Stock by Category">
                                {data.inventory.stock_by_category?.length ? <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={data.inventory.stock_by_category}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="total_stock" fill="#0D2A94" />
                                    </BarChart>
                                </ResponsiveContainer> : <EmptyState message="No stock category data available." />}
                            </ChartCard>

                            <ChartCard title="Top Product Usage">
                                {data.inventory.product_usage?.length ? <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={data.inventory.product_usage}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="product.name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="total_used" fill="#EF4444" />
                                    </BarChart>
                                </ResponsiveContainer> : <EmptyState message="No product usage data available." />}
                            </ChartCard>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                                <AlertTriangle className="text-red-500" size={20} />
                                Low Stock Products
                            </h3>
                            {data.inventory.low_stock_products?.length > 0 ? (
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

            </div>
        </AuthenticatedLayout>
    );
}

function StatCard({ title, value, icon: Icon, color }) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-700 ring-blue-100',
        green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        purple: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
        orange: 'bg-orange-50 text-orange-700 ring-orange-100',
        yellow: 'bg-amber-50 text-amber-700 ring-amber-100',
        red: 'bg-rose-50 text-rose-700 ring-rose-100',
    };

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="mt-2 break-words text-2xl font-semibold tabular-nums text-gray-900">{value ?? '—'}</p>
                </div>
                <div className={`ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ring-1 ${colorClasses[color] || colorClasses.blue}`}>
                    <Icon size={21} aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}

function ChartCard({ title, description, children }) {
    return (
        <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {description && <p className="mt-1 mb-4 text-sm text-gray-500">{description}</p>}
            {!description && <div className="mb-4" />}
            {children}
        </section>
    );
}

function EmptyState({ message }) {
    return (
        <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-sm text-gray-500">
            {message}
        </div>
    );
}
