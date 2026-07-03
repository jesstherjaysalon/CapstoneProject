import { Link, Head } from '@inertiajs/react';

export default function Welcome({ auth, laravelVersion, phpVersion }) {
    return (
        <>
            <Head title="Welcome" />

            <div className="relative min-h-screen overflow-hidden bg-[#0A0A0A] text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(2,132,199,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_26%)]" />
                <div className="pointer-events-none absolute left-8 top-12 h-44 w-44 rounded-full bg-[#2563EB]/15 blur-3xl" />
                <div className="pointer-events-none absolute right-10 top-24 h-52 w-52 rounded-full bg-[#06B6D4]/15 blur-3xl" />
                <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
                <div className="pointer-events-none absolute right-[-48px] bottom-[-24px] h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl" />

                <div className="relative z-10">
                    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-8 lg:px-10">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.33em] text-slate-400">Car service studio</p>
                            <h1 className="text-xl font-semibold tracking-wide text-white sm:text-2xl">AutoCare Luxe</h1>
                        </div>
                        <nav className="flex items-center gap-4">
                            <a href="#services" className="text-sm font-medium text-slate-300 transition hover:text-white">
                                Services
                            </a>
                            <a href="#process" className="text-sm font-medium text-slate-300 transition hover:text-white">
                                Process
                            </a>
                            {!auth.user && (
                                <Link
                                    href={route('login')}
                                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:border-white/20 hover:bg-white/15"
                                >
                                    Sign In
                                </Link>
                            )}
                        </nav>
                    </header>

                    <main className="mx-auto flex min-h-[85vh] max-w-7xl flex-col gap-16 px-6 pb-16 sm:px-8 lg:px-10 lg:pb-24">
                        <section className="relative z-10 flex w-full flex-col justify-center gap-8">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#06B6D4]/20 bg-[#06B6D4]/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-[#CFFAFE] backdrop-blur-sm">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#06B6D4]/90" />
                                Licensed & trusted
                            </div>

                            <div className="space-y-6">
                                <h2 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                                    Premium Car Service Booking Experience
                                </h2>
                                <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                                    Seamlessly book expert maintenance, luxury detailing, and fast repairs with a polished experience designed for high-end vehicles.
                                </p>
                            </div>

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <Link
                                    href={route('login')}
                                    className="inline-flex w-full items-center justify-center rounded-full bg-[#2563EB] px-8 py-4 text-sm font-semibold text-white shadow-[0_24px_70px_-30px_rgba(37,99,235,0.7)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#1D4ED8] sm:w-auto"
                                >
                                    Book Service
                                </Link>
                                <a
                                    href="#services"
                                    className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition duration-300 hover:border-white/30 hover:bg-white/10 sm:w-auto"
                                >
                                    Explore Services
                                </a>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4 text-center backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20">
                                    <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Vehicles</p>
                                    <p className="mt-3 text-xl font-semibold text-white">5,000+</p>
                                </div>
                                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4 text-center backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20">
                                    <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Rating</p>
                                    <p className="mt-3 text-xl font-semibold text-white">4.9/5</p>
                                </div>
                                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4 text-center backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20">
                                    <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Mechanics</p>
                                    <p className="mt-3 text-xl font-semibold text-white">Certified</p>
                                </div>
                            </div>
                        </section>
                    </main>

                    <section id="services" className="mx-auto max-w-7xl px-6 pb-16 sm:px-8 lg:px-10">
                        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="text-sm uppercase tracking-[0.3em] text-[#06B6D4]">Featured services</p>
                                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                                    High-end care for every drive.
                                </h3>
                            </div>
                            <p className="max-w-xl text-sm leading-6 text-slate-400">
                                Choose the service you need from our premium auto care offering, built for luxury vehicles and exacting standards.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                            <div className="group rounded-[2rem] border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Oil Change</p>
                                <p className="mt-4 text-xl font-semibold text-white">Precision lubrication</p>
                                <p className="mt-3 text-sm leading-6 text-slate-400">
                                    Premium oil service with verified brands and exacting standards.
                                </p>
                            </div>
                            <div className="group rounded-[2rem] border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Engine Diagnostics</p>
                                <p className="mt-4 text-xl font-semibold text-white">Smart analysis</p>
                                <p className="mt-3 text-sm leading-6 text-slate-400">
                                    Advanced diagnostics to keep performance precise and reliable.
                                </p>
                            </div>
                            <div className="group rounded-[2rem] border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Car Wash</p>
                                <p className="mt-4 text-xl font-semibold text-white">Showroom finish</p>
                                <p className="mt-3 text-sm leading-6 text-slate-400">
                                    Luxury exterior wash and interior detailing for a flawless finish.
                                </p>
                            </div>
                            <div className="group rounded-[2rem] border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Tire Replacement</p>
                                <p className="mt-4 text-xl font-semibold text-white">Grip redefined</p>
                                <p className="mt-3 text-sm leading-6 text-slate-400">
                                    Expert tire replacement with premium brands and precision alignment.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-7xl px-6 pb-16 sm:px-8 lg:px-10">
                        <div className="mb-12">
                            <p className="text-sm uppercase tracking-[0.3em] text-[#06B6D4]">Why choose us</p>
                            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                                Built for drivers who expect more.
                            </h3>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Certified Technicians</p>
                                <p className="mt-4 text-xl font-semibold text-white">Expert training</p>
                                <p className="mt-3 text-sm leading-6 text-slate-400">Our team is certified for luxury vehicle service and precision performance.</p>
                            </div>
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Fast Booking</p>
                                <p className="mt-4 text-xl font-semibold text-white">Quick reservations</p>
                                <p className="mt-3 text-sm leading-6 text-slate-400">Reserve service instantly with an intuitive booking flow.</p>
                            </div>
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Real-time Tracking</p>
                                <p className="mt-4 text-xl font-semibold text-white">Status updates</p>
                                <p className="mt-3 text-sm leading-6 text-slate-400">Stay informed at every step with real-time service progress updates.</p>
                            </div>
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Affordable Pricing</p>
                                <p className="mt-4 text-xl font-semibold text-white">Clear value</p>
                                <p className="mt-3 text-sm leading-6 text-slate-400">Premium service without surprise fees or confusing packages.</p>
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-7xl px-6 pb-16 sm:px-8 lg:px-10">
                        <div className="mb-12">
                            <p className="text-sm uppercase tracking-[0.3em] text-[#06B6D4]">Testimonials</p>
                            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                                Rave reviews from premium drivers.
                            </h3>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.65)] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                                <p className="text-2xl font-semibold text-white">“A flawless service every time.”</p>
                                <p className="mt-4 text-sm leading-6 text-slate-400">Booked my high-end car for detailed service and they delivered exceptional care, fast updates, and total confidence.</p>
                                <p className="mt-6 text-sm font-semibold text-white">Jasmine L., Executive</p>
                            </div>
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.65)] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                                <p className="text-2xl font-semibold text-white">“Premium booking with luxury care.”</p>
                                <p className="mt-4 text-sm leading-6 text-slate-400">Their platform made scheduling maintenance effortless and the team handled my vehicle like it was their own.</p>
                                <p className="mt-6 text-sm font-semibold text-white">Mark R., Enthusiast</p>
                            </div>
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.65)] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                                <p className="text-2xl font-semibold text-white">“Trusted mechanics and seamless updates.”</p>
                                <p className="mt-4 text-sm leading-6 text-slate-400">Real-time tracking and quick communication made the whole service experience incredibly reliable.</p>
                                <p className="mt-6 text-sm font-semibold text-white">Sofia V., Consultant</p>
                            </div>
                        </div>
                    </section>

                    <section id="process" className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-10">
                        <div className="mb-12">
                            <p className="text-sm uppercase tracking-[0.3em] text-[#06B6D4]">Service journey</p>
                            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                                A clear four-step process.
                            </h3>
                        </div>

                        <div className="grid gap-6 md:grid-cols-4">
                            {[
                                { title: 'Book', subtitle: 'Reserve your premium service slot.' },
                                { title: 'Inspect', subtitle: 'We evaluate your vehicle with precision.' },
                                { title: 'Repair', subtitle: 'Expert technicians deliver flawless care.' },
                                { title: 'Deliver', subtitle: 'Your car returns polished and ready.' },
                            ].map((step, index) => (
                                <div key={index} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#2563EB]/10 text-lg font-semibold text-[#60A5FA]">
                                        {index + 1}
                                    </div>
                                    <h4 className="mt-5 text-xl font-semibold text-white">{step.title}</h4>
                                    <p className="mt-3 text-sm leading-6 text-slate-400">{step.subtitle}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <footer className="mx-auto max-w-7xl px-6 pb-12 sm:px-8 lg:px-10">
                        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-xl">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-sm uppercase tracking-[0.3em] text-[#06B6D4]">AutoCare Luxe</p>
                                    <p className="mt-3 text-sm text-slate-400">Luxury automotive service booking made effortless.</p>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                    <a href="#services" className="transition hover:text-white">Services</a>
                                    <a href="#process" className="transition hover:text-white">Process</a>
                                    <a href={route('login')} className="transition hover:text-white">Sign In</a>
                                </div>
                            </div>
                            <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                                <p>© {new Date().getFullYear()} AutoCare Luxe. All rights reserved.</p>
                                <p>Laravel v{laravelVersion} · PHP v{phpVersion}</p>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
