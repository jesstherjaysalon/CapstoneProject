import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

export default function BookingCalendar({ auth, bookings, filters }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [startDate, setStartDate] = useState(filters?.start_date || '');
    const [endDate, setEndDate] = useState(filters?.end_date || '');

    const applyFilters = () => {
        router.get(route('admin.booking-calendar'), {
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
        router.get(route('admin.booking-calendar'), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        const days = [];
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        
        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        
        return days;
    };

    const getBookingsForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return bookings.filter(booking => booking.date === dateStr);
    };

    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const days = getDaysInMonth(currentDate);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                </div>
            }
        >
            <Head title="Booking Calendar" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {/* Welcome Section */}
                    <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                        <div className="p-6">
                            <h2 className="font-bold text-2xl text-blue-900">Booking Calendar</h2>
                            <p className="text-blue-700 mt-2">View and manage all accepted bookings in a calendar view</p>
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

                    {/* Calendar Section */}
                    <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                        <div className="bg-blue-900 px-6 py-4 border-b border-blue-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Accepted Bookings Calendar</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={previousMonth}
                                        className="px-3 py-1 bg-blue-800 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={goToToday}
                                        className="px-3 py-1 bg-blue-800 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
                                    >
                                        Today
                                    </button>
                                    <button
                                        onClick={nextMonth}
                                        className="px-3 py-1 bg-blue-800 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <h2 className="text-2xl font-bold text-blue-900">
                                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                                </h2>
                            </div>
                            
                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-2">
                                {/* Day Headers */}
                                {dayNames.map((day) => (
                                    <div key={day} className="text-center text-xs font-semibold text-blue-900 py-2">
                                        {day}
                                    </div>
                                ))}
                                
                                {/* Calendar Days */}
                                {days.map((date, index) => {
                                    if (!date) {
                                        return <div key={index} className="h-24"></div>;
                                    }
                                    
                                    const dayBookings = getBookingsForDate(date);
                                    const isToday = new Date().toDateString() === date.toDateString();
                                    
                                    return (
                                        <div
                                            key={index}
                                            className={`h-24 border border-blue-100 rounded-lg p-2 overflow-hidden ${
                                                isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                                            }`}
                                        >
                                            <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-900' : 'text-blue-700'}`}>
                                                {date.getDate()}
                                            </div>
                                            <div className="space-y-1">
                                                {dayBookings.slice(0, 2).map((booking) => (
                                                    <div
                                                        key={booking.id}
                                                        className="text-xs bg-blue-100 text-blue-900 px-1 py-0.5 rounded"
                                                        title={`${booking.customer_name} - ${booking.services}`}
                                                    >
                                                        {booking.customer_name}
                                                    </div>
                                                ))}
                                                {dayBookings.length > 2 && (
                                                    <div className="text-xs text-blue-600">
                                                        +{dayBookings.length - 2} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Bookings List */}
                    <div className="bg-white rounded-lg shadow-[0_8px_24px_rgba(30,58,138,0.25)] border border-blue-100 overflow-hidden">
                        <div className="bg-blue-900 px-6 py-4 border-b border-blue-800">
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">All Accepted Bookings</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-blue-100">
                                <thead className="bg-blue-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider border-b border-blue-200">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider border-b border-blue-200">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider border-b border-blue-200">Services</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider border-b border-blue-200">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-blue-100">
                                    {bookings.length > 0 ? (
                                        bookings.map((booking) => (
                                            <tr key={booking.id} className="hover:bg-blue-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900 font-medium">
                                                    {booking.customer_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-mono">
                                                    {booking.display_date}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">
                                                    {booking.services}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wide border border-blue-600 text-blue-700 bg-blue-50">
                                                        {booking.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-sm text-blue-600">
                                                No accepted bookings available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
