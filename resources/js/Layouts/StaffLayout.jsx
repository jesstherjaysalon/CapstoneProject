import { useState } from 'react';
import { Link } from '@inertiajs/react';

import NavLink from '@/Components/NavLink';

// ICONS
import {
    LayoutDashboard,
    User,
    LogOut,
    Menu,
    ClipboardList,
    CheckCircle,
} from 'lucide-react';

export default function StaffLayout({ user, header, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    const menu = [
        {
            name: 'Dashboard',
            route: 'staff.dashboard',
            icon: LayoutDashboard,
        },
        {
            name: 'Profile',
            route: 'profile.edit',
            icon: User,
        },
        {
            name: 'Tasks',
            route: 'staff.tasks',
            icon: ClipboardList,
        },
        {
            name: 'Service Assignments',
            route: 'staff.service-assignments',
            icon: CheckCircle,
        },
    ];

    return (
        <div className="h-screen flex overflow-hidden bg-white relative">

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
                    fixed md:relative z-50 h-full bg-emerald-700 text-white
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
                                <span className="text-xs text-emerald-200 font-normal">
                                    Staff Portal
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

                    {/* MAIN MENU */}
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

                </nav>

                {/* USER SECTION */}
                <div className="border-t p-3 shadow-[0_-1px_10px_rgba(255,255,255,0.08)]" style={{ borderColor: '#ffffff' }}>

                    {sidebarOpen && (
                        <div className="mb-3">
                            <div className="text-sm font-semibold text-white">
                                {user.name}
                            </div>
                            <div className="text-xs text-emerald-200">
                                {user.email}
                            </div>
                        </div>
                    )}

                    <Link
                        method="post"
                        href={route('logout')}
                        as="button"
                        className="flex items-center gap-3 text-sm text-emerald-200 hover:text-white transition"
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
                        <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {user.name.charAt(0)}
                        </div>
                        {user.name}
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
