import { Head } from '@inertiajs/react';
import {
    ArrowRight,
    BellRing,
    CalendarCheck2,
    CheckCircle2,
    Clock3,
    Gauge,
    Sparkles,
    TrendingUp,
    Wrench,
} from 'lucide-react';
import StaffLayout from '@/Layouts/StaffLayout';

const statCards = [
    {
        label: 'Open jobs',
        value: '24',
        change: '+6% from yesterday',
        icon: Wrench,
        tone: 'emerald',
    },
    {
        label: 'Due today',
        value: '08',
        change: '3 urgent',
        icon: Clock3,
        tone: 'amber',
    },
    {
        label: 'Completed',
        value: '18',
        change: '92% efficiency',
        icon: CheckCircle2,
        tone: 'sky',
    },
    {
        label: 'Satisfaction',
        value: '4.9/5',
        change: 'Top performer',
        icon: TrendingUp,
        tone: 'violet',
    },
];

const priorityTasks = [
    { name: 'Oil change and brake inspection', client: 'Maria Santos', time: '09:30 AM', progress: 72, status: 'In progress' },
    { name: 'AC diagnostics for SUV', client: 'Juan Dela Cruz', time: '11:00 AM', progress: 42, status: 'Waiting for parts' },
    { name: 'Paint touch-up and detail', client: 'Rina Gomez', time: '01:15 PM', progress: 88, status: 'Almost done' },
];

const serviceQueue = [
    { vehicle: 'Toyota Fortuner', service: 'Full service', technician: 'Jayson', eta: '12 mins', status: 'Ready for review' },
    { vehicle: 'Honda Civic', service: 'Tire rotation', technician: 'Ella', eta: '18 mins', status: 'In progress' },
    { vehicle: 'Mitsubishi Mirage', service: 'Battery replacement', technician: 'John', eta: '32 mins', status: 'Scheduled' },
];

const quickActions = [
    'Create service ticket',
    'Review inspections',
    'Assign technician',
    'Send follow-up',
];

const activityMetrics = [
    { day: 'Mon', value: 54 },
    { day: 'Tue', value: 68 },
    { day: 'Wed', value: 60 },
    { day: 'Thu', value: 82 },
    { day: 'Fri', value: 74 },
    { day: 'Sat', value: 91 },
];

export default function StaffDashboard({ auth }) {
    return (
        <StaffLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Operations Overview</h2>}
        >
            <Head title="Staff Dashboard" />

            <div className="space-y-6 p-1">
                <section className="overflow-hidden rounded-[28px] bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 p-6 text-white shadow-[0_20px_50px_rgba(16,185,129,0.25)] sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-xl">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-emerald-50">
                                <Sparkles size={14} />
                                Team performance is strong today
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                Welcome back, {auth.user.name}!
                            </h1>
                            <p className="mt-3 text-sm text-emerald-50/90 sm:text-base">
                                You have 3 urgent tasks requiring attention and 2 appointments ready for review.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                            <div className="rounded-xl bg-white/15 p-3">
                                <BellRing size={22} />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Today</p>
                                <p className="text-2xl font-bold">12 Tasks</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {statCards.map(({ label, value, change, icon: Icon, tone }) => (
                        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm text-slate-500">{label}</p>
                                    <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
                                </div>
                                <div className={`rounded-xl bg-${tone}-100 p-3 text-${tone}-700`}>
                                    <Icon size={22} />
                                </div>
                            </div>
                            <p className="mt-4 text-xs font-medium text-slate-500">{change}</p>
                        </div>
                    ))}
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Priority tasks</p>
                                <h2 className="text-xl font-bold text-slate-900">Today’s focus</h2>
                            </div>
                            <button className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                                View all
                                <ArrowRight size={16} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {priorityTasks.map((task) => (
                                <div key={task.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h3 className="font-semibold text-slate-800">{task.name}</h3>
                                            <p className="mt-1 text-sm text-slate-500">{task.client}</p>
                                        </div>
                                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                            {task.status}
                                        </span>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-2">
                                            <CalendarCheck2 size={14} />
                                            {task.time}
                                        </span>
                                        <span>{task.progress}% complete</span>
                                    </div>

                                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                            style={{ width: `${task.progress}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-4">
                                <p className="text-sm font-medium text-slate-500">Quick actions</p>
                                <h2 className="text-xl font-bold text-slate-900">Need a fast move?</h2>
                            </div>

                            <div className="space-y-3">
                                {quickActions.map((action) => (
                                    <button
                                        key={action}
                                        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                    >
                                        {action}
                                        <ArrowRight size={16} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Efficiency</p>
                                    <h2 className="text-xl font-bold text-slate-900">Weekly output</h2>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                                    <Gauge size={14} />
                                    +18%
                                </div>
                            </div>

                            <div className="mt-5 flex h-32 items-end gap-3">
                                {activityMetrics.map((item) => (
                                    <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                                        <div
                                            className="w-full rounded-t-2xl bg-gradient-to-t from-emerald-600 to-teal-300"
                                            style={{ height: `${item.value}%` }}
                                            title={`${item.day}: ${item.value}%`}
                                        />
                                        <span className="text-xs font-medium text-slate-500">{item.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Service flow</p>
                                <h2 className="text-xl font-bold text-slate-900">Vehicle queue</h2>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">7 vehicles</span>
                        </div>

                        <div className="space-y-3">
                            {serviceQueue.map((item) => (
                                <div key={item.vehicle} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-800">{item.vehicle}</p>
                                        <p className="text-sm text-slate-500">{item.service} • {item.technician}</p>
                                    </div>

                                    <div className="flex items-center gap-3 sm:justify-end">
                                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm">
                                            {item.eta}
                                        </span>
                                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Performance</p>
                                <h2 className="text-xl font-bold text-slate-900">This month</h2>
                            </div>
                            <div className="rounded-full bg-emerald-50 p-2 text-emerald-700">
                                <TrendingUp size={18} />
                            </div>
                        </div>

                        <div className="mt-6 space-y-5">
                            <div>
                                <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                                    <span>Completed services</span>
                                    <span className="font-semibold text-slate-800">86%</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                                    <div className="h-full w-[86%] rounded-full bg-emerald-500" />
                                </div>
                            </div>

                            <div>
                                <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                                    <span>Customer satisfaction</span>
                                    <span className="font-semibold text-slate-800">95%</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                                    <div className="h-full w-[95%] rounded-full bg-sky-500" />
                                </div>
                            </div>

                            <div>
                                <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                                    <span>On-time completion</span>
                                    <span className="font-semibold text-slate-800">90%</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                                    <div className="h-full w-[90%] rounded-full bg-violet-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </StaffLayout>
    );
}
