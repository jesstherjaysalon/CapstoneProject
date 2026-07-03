import { Head } from '@inertiajs/react';
import StaffLayout from '@/Layouts/StaffLayout';

export default function StaffDashboard({ auth }) {
    return (
        <StaffLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Staff Dashboard</h2>}
        >
            <Head title="Staff Dashboard" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Welcome back, {auth.user.name}!</h3>
                        <p className="text-sm text-gray-600">You are logged in as a staff member.</p>
                    </div>
                </div>
            </div>
        </StaffLayout>
    );
}
