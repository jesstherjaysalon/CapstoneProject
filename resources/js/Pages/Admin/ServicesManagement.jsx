import { useEffect, useMemo, useState } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    CheckCircle,
    Plus,
    Pencil,
    Trash2,
    X,
    DollarSign,
} from 'lucide-react';

export default function ServicesManagement({ auth, categories, services }) {
    const { flash = {} } = usePage().props;
    const [activeTab, setActiveTab] = useState('categories');
    const [categoryModal, setCategoryModal] = useState({ open: false, mode: 'create', id: null });
    const [serviceModal, setServiceModal] = useState({ open: false, mode: 'create', id: null });
    const [deleteModal, setDeleteModal] = useState({ open: false, type: null, id: null, label: '' });

    const categoryForm = useForm({ name: '' });
    const serviceForm = useForm({
        category_id: categories.length ? categories[0].id : '',
        name: '',
        description: '',
        price: '',
    });

    useEffect(() => {
        if (!serviceForm.data.category_id && categories.length) {
            serviceForm.setData('category_id', categories[0].id);
        }
    }, [categories]);

    useEffect(() => {
        if (!categoryModal.open) {
            categoryForm.reset('name');
        }
    }, [categoryModal.open]);

    useEffect(() => {
        if (!serviceModal.open) {
            serviceForm.reset('name', 'description', 'price');
            if (categories.length) {
                serviceForm.setData('category_id', categories[0].id);
            }
        }
    }, [serviceModal.open]);

    const selectedCategory = useMemo(
        () => categories.find((category) => category.id === serviceForm.data.category_id),
        [categories, serviceForm.data.category_id],
    );

    const openCategoryForm = (mode, category = null) => {
        setCategoryModal({ open: true, mode, id: category?.id ?? null });
        if (mode === 'edit' && category) {
            categoryForm.setData('name', category.name);
        }
    };

    const openServiceForm = (mode, service = null) => {
        setServiceModal({ open: true, mode, id: service?.id ?? null });
        if (mode === 'edit' && service) {
            serviceForm.setData('category_id', service.category_id);
            serviceForm.setData('name', service.name);
            serviceForm.setData('description', service.description || '');
            serviceForm.setData('price', service.price);
        }
    };

    const handleCategorySubmit = (event) => {
        event.preventDefault();

        if (categoryModal.mode === 'create') {
            categoryForm.post(route('admin.categories.store'), {
                preserveScroll: true,
                onSuccess: () => setCategoryModal({ ...categoryModal, open: false }),
            });
            return;
        }

        categoryForm.put(route('admin.categories.update', categoryModal.id), {
            preserveScroll: true,
            onSuccess: () => setCategoryModal({ ...categoryModal, open: false }),
        });
    };

    const handleServiceSubmit = (event) => {
        event.preventDefault();

        if (serviceModal.mode === 'create') {
            serviceForm.post(route('admin.services.store'), {
                preserveScroll: true,
                onSuccess: () => setServiceModal({ ...serviceModal, open: false }),
            });
            return;
        }

        serviceForm.put(route('admin.services.update', serviceModal.id), {
            preserveScroll: true,
            onSuccess: () => setServiceModal({ ...serviceModal, open: false }),
        });
    };

    const confirmDelete = (type, id, label) => {
        setDeleteModal({ open: true, type, id, label });
    };

    const handleDelete = () => {
        if (!deleteModal.type || !deleteModal.id) {
            return;
        }

        router.delete(route(`admin.${deleteModal.type}.destroy`, deleteModal.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteModal({ open: false, type: null, id: null, label: '' }),
        });
    };

    const renderValidationError = (message) => (
        <p className="mt-1 text-sm text-rose-600">{message}</p>
    );

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Services Management</h2>}
        >
            <Head title="Services Management" />

            <div className="space-y-6">
                {flash.success && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
                        <div className="flex items-start gap-2">
                            <CheckCircle className="mt-0.5 h-5 w-5" />
                            <div>{flash.success}</div>
                        </div>
                    </div>
                )}

                <div className="rounded-3xl border border-slate-200 bg-white/80 p-5" style={{ boxShadow: '0 18px 50px rgba(13,42,148,0.18)' }}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900">Categories & Services</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Manage your service catalog and category structure from a single dashboard.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => openCategoryForm('create')}
                                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                            >
                                <Plus size={16} /> Add Category
                            </button>
                            <button
                                type="button"
                                onClick={() => openServiceForm('create')}
                                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                            >
                                <Plus size={16} /> Add Service
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.15fr_1.85fr]">
                    <section className="rounded-3xl border border-slate-200 bg-white p-5" style={{ boxShadow: '0 12px 30px rgba(13,42,148,0.12)' }}>
                        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Categories</p>
                                <p className="text-sm text-slate-500">Organize services using category groups.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => openCategoryForm('create')}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <Plus size={16} /> New Category
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm text-slate-700">
                                <thead className="border-b border-slate-200 text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">Services</th>
                                        <th className="px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map((category) => (
                                        <tr key={category.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                                            <td className="px-4 py-4 font-medium text-slate-900">{category.name}</td>
                                            <td className="px-4 py-4 text-slate-500">{category.services.length}</td>
                                            <td className="px-4 py-4 text-slate-600">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openCategoryForm('edit', category)}
                                                        className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                                    >
                                                        <Pencil size={14} /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => confirmDelete('categories', category.id, category.name)}
                                                        className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {categories.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-6 text-center text-sm text-slate-500">
                                                No categories available. Add a category to begin.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-5" style={{ boxShadow: '0 12px 30px rgba(13,42,148,0.12)' }}>
                        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Services</p>
                                <p className="text-sm text-slate-500">Manage service details, pricing, and category assignment.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => openServiceForm('create')}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <Plus size={16} /> New Service
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm text-slate-700">
                                <thead className="border-b border-slate-200 text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Service</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3">Price</th>
                                        <th className="px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {services.map((service) => (
                                        <tr key={service.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                                            <td className="px-4 py-4 font-medium text-slate-900">{service.name}</td>
                                            <td className="px-4 py-4 text-slate-600">{service.category?.name ?? 'Unassigned'}</td>
                                            <td className="px-4 py-4 text-slate-700">₱{parseFloat(service.price).toFixed(2)}</td>
                                            <td className="px-4 py-4 text-slate-600">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openServiceForm('edit', service)}
                                                        className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                                    >
                                                        <Pencil size={14} /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => confirmDelete('services', service.id, service.name)}
                                                        className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {services.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-6 text-center text-sm text-slate-500">
                                                No services available. Start by creating a new service.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>

            {categoryModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
                    <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Category</p>
                                <h2 className="text-xl font-semibold text-slate-900">
                                    {categoryModal.mode === 'create' ? 'Add Category' : 'Edit Category'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCategoryModal({ open: false, mode: 'create', id: null })}
                                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form className="space-y-5 p-6" onSubmit={handleCategorySubmit}>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">Category name</label>
                                <input
                                    type="text"
                                    value={categoryForm.data.name}
                                    onChange={(event) => categoryForm.setData('name', event.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
                                />
                                {categoryForm.errors.name && renderValidationError(categoryForm.errors.name)}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setCategoryModal({ open: false, mode: 'create', id: null })}
                                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={categoryForm.processing}
                                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {categoryModal.mode === 'create' ? 'Create Category' : 'Update Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {serviceModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
                    <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Service</p>
                                <h2 className="text-xl font-semibold text-slate-900">
                                    {serviceModal.mode === 'create' ? 'Add Service' : 'Edit Service'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setServiceModal({ open: false, mode: 'create', id: null })}
                                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form className="space-y-5 p-6" onSubmit={handleServiceSubmit}>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
                                    <select
                                        value={serviceForm.data.category_id}
                                        onChange={(event) => serviceForm.setData('category_id', event.target.value)}
                                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
                                    >
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                    {serviceForm.errors.category_id && renderValidationError(serviceForm.errors.category_id)}
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
                                    <input
                                        type="text"
                                        value={serviceForm.data.name}
                                        onChange={(event) => serviceForm.setData('name', event.target.value)}
                                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
                                    />
                                    {serviceForm.errors.name && renderValidationError(serviceForm.errors.name)}
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                                <textarea
                                    value={serviceForm.data.description}
                                    onChange={(event) => serviceForm.setData('description', event.target.value)}
                                    rows={4}
                                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
                                />
                                {serviceForm.errors.description && renderValidationError(serviceForm.errors.description)}
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">Price</label>
                                  <div className="relative">
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
        ₱
    </span>

    <input
        type="number"
        step="0.01"
        min="0"
        value={serviceForm.data.price}
        onChange={(event) =>
            serviceForm.setData('price', event.target.value)
        }
        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-12 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
    />

                                    </div>
                                    {serviceForm.errors.price && renderValidationError(serviceForm.errors.price)}
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">Currently assigned</label>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                        {selectedCategory ? selectedCategory.name : 'Select a category'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setServiceModal({ open: false, mode: 'create', id: null })}
                                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={serviceForm.processing}
                                    className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {serviceModal.mode === 'create' ? 'Create Service' : 'Update Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
                    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="border-b border-slate-200 p-6">
                            <div className="flex items-center gap-3 text-rose-600">
                                <Trash2 size={22} />
                                <div>
                                    <p className="text-lg font-semibold text-slate-900">Confirm deletion</p>
                                    <p className="text-sm text-slate-500">
                                        This will permanently remove "{deleteModal.label}".
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4 p-6">
                            <p className="text-sm text-slate-600">Are you sure you want to delete this {deleteModal.type === 'categories' ? 'category' : 'service'}? This action cannot be undone.</p>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDeleteModal({ open: false, type: null, id: null, label: '' })}
                                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
