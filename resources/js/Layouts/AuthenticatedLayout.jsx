import { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';

import NavLink from '@/Components/NavLink';

// ICONS
import {
    LayoutDashboard,
    User,
    LogOut,
    Menu,
    Wrench,
    Users,
    ChevronDown,
    ChevronRight,
    Settings,
    Clock,
    Calendar,
    CalendarDays,
    ClipboardList,
    Package,
    AlertTriangle,
    BarChart3,
} from 'lucide-react';

export default function Authenticated({ user, header, children }) {
    const safeUser = user || { role: 'Customer', name: 'Guest', email: '' };
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    const [managementOpen, setManagementOpen] = useState(false);
    const [bookingsOpen, setBookingsOpen] = useState(false);
    const [lowStockCount, setLowStockCount] = useState(0);

    useEffect(() => {
        const fetchLowStock = async () => {
            try {
                const response = await fetch('/admin/products/low-stock', {
                    headers: { 'Accept': 'application/json' },
                });
                const data = await response.json();
                console.log('Low stock data:', data);
                setLowStockCount(data.length || 0);
            } catch (error) {
                console.error('Error fetching low stock:', error);
                setLowStockCount(0);
            }
        };

        fetchLowStock();
        const interval = setInterval(fetchLowStock, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const menu = [
        {
            name: 'Dashboard',
            route: 'dashboard',
            icon: LayoutDashboard,
        },
        {
            name: 'Profile',
            route: 'profile.edit',
            icon: User,
        },
    ];

    const managementMenu = [
        {
            name: 'Staff',
            route: 'staff.index',
            icon: Users,
        },
        {
            name: 'Services',
            route: 'admin.services.management',
            icon: Wrench,
        },
        {
            name: 'Schedule',
            route: 'admin.schedule.index',
            icon: Clock,
        },
    ];

    

    return (
        <div className="h-screen flex overflow-hidden bg-white relative">

            {/* Sidebar-only dark theme (no full-page accent) */}

            {/* MOBILE BACKDROP */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 bg-black/40 z-40 md:hidden"
                />
            )}

            {/* SIDEBAR */}
            <aside
                className={`
                    fixed md:relative z-50 h-full bg-[#0D2A94] text-white
                    flex flex-col transition-all duration-300 shadow-lg
                    ${sidebarOpen ? 'w-64' : 'w-20'}
                    ${mobileOpen ? 'left-0' : '-left-full md:left-0'}
                `}
                style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
            >
                <div style={{ position: 'absolute', inset: 0, zIndex: -1 }} />

                {/* TOP LOGO SECTION */}
                <div className="h-16 flex items-center justify-between px-4 border-b shadow-[0_1px_10px_rgba(255,255,255,0.08)]" style={{ borderColor: '#ffffff' }}>

                    <div className="flex items-center gap-3">
                        <img
                            src="/images/logo.png"
                            alt="Logo"
                            className="h-8 w-8 object-contain"
                        />

                        {sidebarOpen && (
                            <span className="font-semibold text-white leading-tight">
                                Car Services<br />
                                <span className="text-xs text-indigo-200 font-normal">
                                    Management System
                                </span>
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="text-white hover:opacity-80"
                    >
                        <Menu size={20} />
                    </button>
                </div>

                {/* MENU */}
                <nav className="flex-1 flex flex-col gap-1 px-2 py-4">

                    {/* CATEGORY: MAIN */}
                    {sidebarOpen && (
                        <div className="px-3 py-1 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                            Main
                        </div>
                    )}
                    {menu.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.route}
                                href={route(item.route)}
                                active={route().current(item.route)}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-white transition"
                            >
                                <Icon size={20} />

                                {sidebarOpen && (
                                    <span className="text-sm font-medium">
                                        {item.name}
                                    </span>
                                )}
                            </NavLink>
                        );
                    })}

                    {/* CATEGORY: BOOKINGS (ADMIN ONLY) */}
                    {safeUser.role === 'Admin' && (
                        <>
                            {sidebarOpen && (
                                <div className="px-3 py-1 mt-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                                    Bookings
                                </div>
                            )}
                            <NavLink
                                href={route('admin.appointments.index')}
                                active={route().current('admin.appointments.index')}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-white transition"
                            >
                                <Calendar size={20} />

                                {sidebarOpen && (
                                    <span className="text-sm font-medium">
                                        Appointments
                                    </span>
                                )}
                            </NavLink>

                            <NavLink
                                href={route('admin.booking-calendar')}
                                active={route().current('admin.booking-calendar')}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-white transition"
                            >
                                <CalendarDays size={20} />

                                {sidebarOpen && (
                                    <span className="text-sm font-medium">
                                        Booking Calendar
                                    </span>
                                )}
                            </NavLink>

                            <NavLink
                                href={route('admin.job-orders.index')}
                                active={route().current('admin.job-orders.index')}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-white transition"
                            >
                                <ClipboardList size={20} />

                                {sidebarOpen && (
                                    <span className="text-sm font-medium">
                                        Job Orders
                                    </span>
                                )}
                            </NavLink>
                        </>
                    )}

                    {/* CATEGORY: MANAGEMENT (ADMIN ONLY) */}
                    {safeUser.role === 'Admin' && (
                        <>
                            {sidebarOpen && (
                                <div className="px-3 py-1 mt-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                                    Management
                                </div>
                            )}

                            {/* Dropdown Button */}
                            <button
                                onClick={() => setManagementOpen(!managementOpen)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-white transition"
                            >
                                <div className="flex items-center gap-3">
                                    <Settings size={20} />
                                    {sidebarOpen && (
                                        <span className="text-sm font-medium">
                                            Management
                                        </span>
                                    )}
                                </div>

                                {sidebarOpen && (
                                    <ChevronDown
                                        size={18}
                                        className={`transition-transform ${
                                            managementOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                )}
                            </button>

                            {/* Dropdown Items */}
                            {managementOpen && sidebarOpen && (
                                <div className="ml-6 mt-1 flex flex-col gap-1">

                                    {managementMenu.map((item) => {
                                        const Icon = item.icon;

                                        return (
                                            <NavLink
                                                key={item.route}
                                                href={route(item.route)}
                                                active={route().current(item.route)}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-white transition"
                                            >
                                                <Icon size={18} />

                                                <span className="text-sm">
                                                    {item.name}
                                                </span>
                                            </NavLink>
                                        );
                                    })}

                                </div>
                            )}
                        </>
                    )}

                    {/* CATEGORY: INVENTORY (ADMIN ONLY) */}
                    {safeUser.role === 'Admin' && (
                        <>
                            {sidebarOpen && (
                                <div className="px-3 py-1 mt-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                                    Inventory
                                </div>
                            )}
                            <NavLink
                                href={route('admin.inventory-management.index')}
                                active={route().current('admin.inventory-management.index')}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-white transition relative"
                            >
                                <Package size={20} />
                                {lowStockCount > 0 && (
                                    <span className="absolute top-1 right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                    </span>
                                )}

                                {sidebarOpen && (
                                    <span className="text-sm font-medium">
                                        Inventory Management
                                    </span>
                                )}
                                {sidebarOpen && lowStockCount > 0 && (
                                    <AlertTriangle className="ml-auto text-rose-400 animate-pulse" size={16} />
                                )}
                            </NavLink>
                        </>
                    )}

                    {/* CATEGORY: REPORTS (ADMIN ONLY) */}
                    {safeUser.role === 'Admin' && (
                        <>
                            {sidebarOpen && (
                                <div className="px-3 py-1 mt-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                                    Reports
                                </div>
                            )}
                            <NavLink
                                href={route('admin.reports.index')}
                                active={route().current('admin.reports.index')}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-white/10 hover:text-white transition"
                            >
                                <BarChart3 size={20} />

                                {sidebarOpen && (
                                    <span className="text-sm font-medium">
                                        Reports
                                    </span>
                                )}
                            </NavLink>
                        </>
                    )}

                </nav>

                {/* USER SECTION */}
                <div className="border-t p-3 shadow-[0_-1px_10px_rgba(255,255,255,0.08)]" style={{ borderColor: '#ffffff' }}>

                    {sidebarOpen && (
                        <div className="mb-3">
                            <div className="text-sm font-semibold text-white">
                                {safeUser.name}
                            </div>
                            <div className="text-xs text-indigo-200">
                                {safeUser.email}
                            </div>
                        </div>
                    )}

                    <Link
                        method="post"
                        href={route('logout')}
                        as="button"
                        className="flex items-center gap-3 text-sm text-indigo-200 hover:text-white transition"
                    >
                        <LogOut size={18} />
                        {sidebarOpen && <span>Logout</span>}
                    </Link>
                </div>

            </aside>

            {/* MAIN AREA */}
            <div className="flex-1 flex flex-col relative z-20">

                {/* TOP BAR */}
                <header className="h-16 bg-white/70 backdrop-blur border-b flex items-center justify-between px-4">

                    <button
                        onClick={() => setMobileOpen(true)}
                        className="md:hidden text-white"
                    >
                        <Menu size={22} />
                    </button>

                    <div className="text-sm font-medium text-gray-700">
                        {header}
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {safeUser.name.charAt(0)}
                        </div>
                        {safeUser.name}
                    </div>

                </header>

                {/* CONTENT */}
                <main className="flex-1 p-6 overflow-y-auto">
                    {children}
                </main>

            </div>
        </div>
    );
}