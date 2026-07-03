import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { 
    Plus, Pencil, Trash2, Package, Truck, Box, Search, X, Check, 
    ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle, AlertTriangle, 
    PlusCircle, ClipboardList, TrendingDown, Clock
} from 'lucide-react';

export default function InventoryManagement({ auth }) {
    const [activeTab, setActiveTab] = useState('categories');
    
    // Categories State
    const [categories, setCategories] = useState([]);
    const [categorySearch, setCategorySearch] = useState('');
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryFormData, setCategoryFormData] = useState({
        name: '',
        description: '',
        has_price: false,
        deduct_on_service: false,
        is_asset: false,
    });

    // Suppliers State
    const [suppliers, setSuppliers] = useState([]);
    const [supplierSearch, setSupplierSearch] = useState('');
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [supplierFormData, setSupplierFormData] = useState({
        name: '',
        contact: '',
    });

    // Products State
    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [lowStockCount, setLowStockCount] = useState(0);
    const [productFormData, setProductFormData] = useState({
        supplier_id: '',
        inventory_category_id: '',
        name: '',
        unit: 'pcs',
        current_stock: 0,
        reorder_level: 10,
        price: '',
        description: '',
        is_active: true,
    });
    const [stockFormData, setStockFormData] = useState({
        quantity: '',
        remarks: '',
    });

    // Stock Transactions State
    const [transactions, setTransactions] = useState([]);
    const [transactionSearch, setTransactionSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    // Product Requests State
    const [requests, setRequests] = useState([]);
    const [requestSearch, setRequestSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Fetch Functions
    const fetchCategories = async () => {
        try {
            const response = await fetch('/admin/inventory-categories', {
                headers: { 'Accept': 'application/json' },
            });
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await fetch('/admin/suppliers', {
                headers: { 'Accept': 'application/json' },
            });
            const data = await response.json();
            setSuppliers(data);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await fetch('/admin/products', {
                headers: { 'Accept': 'application/json' },
            });
            const data = await response.json();
            setProducts(data);
            const lowStock = data.filter(p => p.current_stock <= p.reorder_level).length;
            setLowStockCount(lowStock);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            const params = new URLSearchParams();
            if (filterType) params.append('transaction_type', filterType);
            if (filterFromDate) params.append('from_date', filterFromDate);
            if (filterToDate) params.append('to_date', filterToDate);

            const response = await fetch(`/admin/stock-transactions?${params.toString()}`, {
                headers: { 'Accept': 'application/json' },
            });
            const data = await response.json();
            setTransactions(data.data || data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    };

    const fetchRequests = async () => {
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.append('status', filterStatus);

            const response = await fetch(`/admin/service-product-usage?${params.toString()}`, {
                headers: { 'Accept': 'application/json' },
            });
            const data = await response.json();
            setRequests(data.data || data);
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchSuppliers();
        fetchProducts();
        fetchTransactions();
        fetchRequests();
    }, [filterType, filterFromDate, filterToDate, filterStatus]);

    // Category Handlers
    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        const url = editingCategory
            ? `/admin/inventory-categories/${editingCategory.id}`
            : '/admin/inventory-categories';
        const method = editingCategory ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify(categoryFormData),
            });

            if (response.ok) {
                await fetchCategories();
                setIsCategoryModalOpen(false);
                setEditingCategory(null);
                setCategoryFormData({
                    name: '',
                    description: '',
                    has_price: false,
                    deduct_on_service: false,
                    is_asset: false,
                });
            }
        } catch (error) {
            console.error('Error saving category:', error);
        }
    };

    const handleCategoryDelete = async (category) => {
        if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;

        try {
            const response = await fetch(`/admin/inventory-categories/${category.id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });

            if (response.ok) {
                await fetchCategories();
            } else {
                const data = await response.json();
                alert(data.message || 'Error deleting category');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    // Supplier Handlers
    const handleSupplierSubmit = async (e) => {
        e.preventDefault();
        const url = editingSupplier
            ? `/admin/suppliers/${editingSupplier.id}`
            : '/admin/suppliers';
        const method = editingSupplier ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify(supplierFormData),
            });

            if (response.ok) {
                await fetchSuppliers();
                setIsSupplierModalOpen(false);
                setEditingSupplier(null);
                setSupplierFormData({ name: '', contact: '' });
            }
        } catch (error) {
            console.error('Error saving supplier:', error);
        }
    };

    const handleSupplierDelete = async (supplier) => {
        if (!confirm(`Are you sure you want to delete "${supplier.name}"?`)) return;

        try {
            const response = await fetch(`/admin/suppliers/${supplier.id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });

            if (response.ok) {
                await fetchSuppliers();
            } else {
                const data = await response.json();
                alert(data.message || 'Error deleting supplier');
            }
        } catch (error) {
            console.error('Error deleting supplier:', error);
        }
    };

    // Product Handlers
    const handleProductSubmit = async (e) => {
        e.preventDefault();
        const url = editingProduct
            ? `/admin/products/${editingProduct.id}`
            : '/admin/products';
        const method = editingProduct ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify(productFormData),
            });

            if (response.ok) {
                await fetchProducts();
                setIsProductModalOpen(false);
                setEditingProduct(null);
                resetProductFormData();
            } else {
                const data = await response.json();
                alert(data.message || 'Error saving product');
            }
        } catch (error) {
            console.error('Error saving product:', error);
        }
    };

    const handleStockSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`/admin/products/${selectedProduct.id}/add-stock`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify(stockFormData),
            });

            if (response.ok) {
                await fetchProducts();
                await fetchTransactions();
                setIsStockModalOpen(false);
                setSelectedProduct(null);
                setStockFormData({ quantity: '', remarks: '' });
            }
        } catch (error) {
            console.error('Error adding stock:', error);
        }
    };

    const handleProductDelete = async (product) => {
        if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;

        try {
            const response = await fetch(`/admin/products/${product.id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });

            if (response.ok) {
                await fetchProducts();
            } else {
                const data = await response.json();
                alert(data.message || 'Error deleting product');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    const resetProductFormData = () => {
        setProductFormData({
            supplier_id: '',
            inventory_category_id: '',
            name: '',
            unit: 'pcs',
            current_stock: 0,
            reorder_level: 10,
            price: '',
            description: '',
            is_active: true,
        });
    };

    // Request Handlers
    const handleApprove = async (request) => {
        if (!confirm(`Approve request for ${request.product?.name}?`)) return;

        try {
            const response = await fetch(`/admin/service-product-usage/${request.id}/approve`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });

            if (response.ok) {
                await fetchRequests();
                await fetchProducts();
                await fetchTransactions();
            } else {
                const data = await response.json();
                alert(data.message || 'Error approving request');
            }
        } catch (error) {
            console.error('Error approving request:', error);
        }
    };

    const handleReject = async (request) => {
        if (!confirm(`Reject request for ${request.product?.name}?`)) return;

        try {
            const response = await fetch(`/admin/service-product-usage/${request.id}/reject`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });

            if (response.ok) {
                await fetchRequests();
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    const handleDeleteRequest = async (request) => {
        if (!confirm(`Delete request for ${request.product?.name}?`)) return;

        try {
            const response = await fetch(`/admin/service-product-usage/${request.id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });

            if (response.ok) {
                await fetchRequests();
            }
        } catch (error) {
            console.error('Error deleting request:', error);
        }
    };

    // Filtered Data
    const filteredCategories = Array.isArray(categories) ? categories.filter(category =>
        category.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
        (category.description && category.description.toLowerCase().includes(categorySearch.toLowerCase()))
    ) : [];

    const filteredSuppliers = Array.isArray(suppliers) ? suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        (supplier.contact && supplier.contact.toLowerCase().includes(supplierSearch.toLowerCase()))
    ) : [];

    const filteredProducts = Array.isArray(products) ? products.filter(product =>
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (product.supplier && product.supplier.name.toLowerCase().includes(productSearch.toLowerCase())) ||
        (product.inventory_category && product.inventory_category.name.toLowerCase().includes(productSearch.toLowerCase()))
    ) : [];

    const filteredTransactions = Array.isArray(transactions) ? transactions.filter(transaction => {
        const searchLower = transactionSearch.toLowerCase();
        const productName = transaction.product?.name?.toLowerCase() || '';
        const remarks = transaction.remarks?.toLowerCase() || '';
        return productName.includes(searchLower) || remarks.includes(searchLower);
    }) : [];

    const filteredRequests = Array.isArray(requests) ? requests.filter(request => {
        const searchLower = requestSearch.toLowerCase();
        const productName = request.product?.name?.toLowerCase() || '';
        const jobOrderId = request.job_order_id?.toString() || '';
        return productName.includes(searchLower) || jobOrderId.includes(searchLower);
    }) : [];

    const selectedCategory = Array.isArray(categories) ? categories.find(c => c.id === parseInt(productFormData.inventory_category_id)) : null;
    const requiresPrice = selectedCategory?.has_price;

    const tabs = [
        { id: 'categories', label: 'Categories', icon: Package },
        { id: 'suppliers', label: 'Suppliers', icon: Truck },
        { id: 'products', label: 'Products', icon: Box, hasAlert: true },
        { id: 'transactions', label: 'Stock Transactions', icon: ArrowUpCircle },
        { id: 'requests', label: 'Product Requests', icon: CheckCircle },
    ];

    const statusClasses = {
        Pending: 'bg-amber-100 text-amber-800',
        Approved: 'bg-emerald-100 text-emerald-800',
        Rejected: 'bg-rose-100 text-rose-800',
    };

    const pendingRequests = Array.isArray(requests) ? requests.filter(r => r.status === 'Pending').length : 0;

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Inventory Management</h2>}>
            <Head title="Inventory Management" />

            <div className="space-y-6 py-6 px-4">
                {/* Page Title Container */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                Manage inventory categories, suppliers, products, stock transactions, and product requests.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-600">Total Products</p>
                                <p className="mt-2 text-3xl font-bold text-slate-900">{products.length}</p>
                            </div>
                            <div className="rounded-xl bg-indigo-100 p-3">
                                <Box className="h-6 w-6 text-indigo-600" />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-rose-50 to-white p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-600">Low Stock</p>
                                <p className="mt-2 text-3xl font-bold text-rose-600">{lowStockCount}</p>
                            </div>
                            <div className="rounded-xl bg-rose-100 p-3">
                                <AlertTriangle className="h-6 w-6 text-rose-600" />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-600">Pending Requests</p>
                                <p className="mt-2 text-3xl font-bold text-amber-600">{pendingRequests}</p>
                            </div>
                            <div className="rounded-xl bg-amber-100 p-3">
                                <Clock className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-600">Categories</p>
                                <p className="mt-2 text-3xl font-bold text-emerald-600">{categories.length}</p>
                            </div>
                            <div className="rounded-xl bg-emerald-100 p-3">
                                <Package className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Container */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                    {/* Tabs */}
                    <div className="border-b border-slate-200">
                        <nav className="flex -mb-px gap-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 rounded-t-2xl transition-colors relative ${
                                            activeTab === tab.id
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                                                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                        {tab.id === 'requests' && pendingRequests > 0 && (
                                            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                                                {pendingRequests}
                                            </span>
                                        )}
                                        {tab.id === 'products' && lowStockCount > 0 && (
                                            <span className="absolute top-2 right-2 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="mt-6">
                        {/* Categories Tab */}
                        {activeTab === 'categories' && (
                            <div>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-slate-900">Inventory Categories</h2>
                                        <p className="mt-1 text-sm text-slate-500">Manage product categories and their settings.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingCategory(null);
                                            setCategoryFormData({
                                                name: '',
                                                description: '',
                                                has_price: false,
                                                deduct_on_service: false,
                                                is_asset: false,
                                            });
                                            setIsCategoryModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Category
                                    </button>
                                </div>

                                <div className="mb-6 relative max-w-md">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search categories..."
                                        value={categorySearch}
                                        onChange={(e) => setCategorySearch(e.target.value)}
                                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                                    <p className="text-sm text-slate-500">
                                        Showing <span className="font-semibold text-slate-900">{filteredCategories.length}</span> categor{filteredCategories.length === 1 ? 'y' : 'ies'}.
                                    </p>
                                </div>

                                {filteredCategories.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                        <Package className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                                        <p className="text-sm font-semibold text-slate-700">
                                            {categorySearch ? 'No matching categories found.' : 'No categories found yet.'}
                                        </p>
                                        <p className="mt-2 text-sm text-slate-500">
                                            {categorySearch ? 'Try another search term.' : 'Create your first category to get started.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: '0 12px 30px rgba(13,42,148,0.12)' }}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50">
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Name</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Description</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Has Price</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Deduct on Service</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Is Asset</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Products</th>
                                                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {filteredCategories.map((category) => (
                                                        <tr key={category.id} className="hover:bg-slate-50 transition">
                                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{category.name}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{category.description || '-'}</td>
                                                            <td className="px-6 py-4">
                                                                {category.has_price ? <Check className="w-4 h-4 inline text-emerald-600" /> : <X className="w-4 h-4 inline text-slate-400" />}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {category.deduct_on_service ? <Check className="w-4 h-4 inline text-emerald-600" /> : <X className="w-4 h-4 inline text-slate-400" />}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {category.is_asset ? <Check className="w-4 h-4 inline text-emerald-600" /> : <X className="w-4 h-4 inline text-slate-400" />}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{category.products_count || 0}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingCategory(category);
                                                                        setCategoryFormData({
                                                                            name: category.name,
                                                                            description: category.description || '',
                                                                            has_price: category.has_price,
                                                                            deduct_on_service: category.deduct_on_service,
                                                                            is_asset: category.is_asset,
                                                                        });
                                                                        setIsCategoryModalOpen(true);
                                                                    }}
                                                                    className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-200 transition mr-2"
                                                                >
                                                                    <Pencil size={12} /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCategoryDelete(category)}
                                                                    className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 transition"
                                                                >
                                                                    <Trash2 size={12} /> Delete
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Suppliers Tab */}
                        {activeTab === 'suppliers' && (
                            <div>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-slate-900">Suppliers</h2>
                                        <p className="mt-1 text-sm text-slate-500">Manage product suppliers and their contact information.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingSupplier(null);
                                            setSupplierFormData({ name: '', contact: '' });
                                            setIsSupplierModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Supplier
                                    </button>
                                </div>

                                <div className="mb-6 relative max-w-md">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search suppliers..."
                                        value={supplierSearch}
                                        onChange={(e) => setSupplierSearch(e.target.value)}
                                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                                    <p className="text-sm text-slate-500">
                                        Showing <span className="font-semibold text-slate-900">{filteredSuppliers.length}</span> supplier{filteredSuppliers.length === 1 ? '' : 's'}.
                                    </p>
                                </div>

                                {filteredSuppliers.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                        <Truck className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                                        <p className="text-sm font-semibold text-slate-700">
                                            {supplierSearch ? 'No matching suppliers found.' : 'No suppliers found yet.'}
                                        </p>
                                        <p className="mt-2 text-sm text-slate-500">
                                            {supplierSearch ? 'Try another search term.' : 'Add your first supplier to get started.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: '0 12px 30px rgba(13,42,148,0.12)' }}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50">
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Name</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Contact</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Products</th>
                                                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {filteredSuppliers.map((supplier) => (
                                                        <tr key={supplier.id} className="hover:bg-slate-50 transition">
                                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{supplier.name}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{supplier.contact || '-'}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{supplier.products_count || 0}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                                                    onClick={() => {
                                                                        setEditingSupplier(supplier);
                                                                        setSupplierFormData({
                                                                            name: supplier.name,
                                                                            contact: supplier.contact || '',
                                                                        });
                                                                        setIsSupplierModalOpen(true);
                                                                    }}
                                                                    className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-200 transition mr-2"
                                                                >
                                                                    <Pencil size={12} /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSupplierDelete(supplier)}
                                                                    className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 transition"
                                                                >
                                                                    <Trash2 size={12} /> Delete
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Products Tab */}
                        {activeTab === 'products' && (
                            <div>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-slate-900">Products</h2>
                                        <p className="mt-1 text-sm text-slate-500">Manage inventory products, stock levels, and pricing.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingProduct(null);
                                            resetProductFormData();
                                            setIsProductModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Product
                                    </button>
                                </div>

                                <div className="mb-6 relative max-w-md">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                                    <p className="text-sm text-slate-500">
                                        Showing <span className="font-semibold text-slate-900">{filteredProducts.length}</span> product{filteredProducts.length === 1 ? '' : 's'}.
                                    </p>
                                </div>

                                {filteredProducts.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                        <Box className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                                        <p className="text-sm font-semibold text-slate-700">
                                            {productSearch ? 'No matching products found.' : 'No products found yet.'}
                                        </p>
                                        <p className="mt-2 text-sm text-slate-500">
                                            {productSearch ? 'Try another search term.' : 'Add your first product to get started.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: '0 12px 30px rgba(13,42,148,0.12)' }}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50">
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Name</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Category</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Supplier</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Stock</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Price</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                                                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {filteredProducts.map((product) => (
                                                        <tr key={product.id} className="hover:bg-slate-50 transition">
                                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{product.name}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{product.inventory_category?.name || '-'}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{product.supplier?.name || '-'}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={product.current_stock <= product.reorder_level ? 'text-rose-600 font-semibold' : 'text-slate-900'}>
                                                                        {product.current_stock} {product.unit}
                                                                    </span>
                                                                    {product.current_stock <= product.reorder_level && (
                                                                        <AlertTriangle className="w-4 h-4 text-rose-600" title="Low stock" />
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{product.price ? `₱${parseFloat(product.price).toFixed(2)}` : '-'}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${product.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                                                    {product.is_active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedProduct(product);
                                                                        setStockFormData({ quantity: '', remarks: '' });
                                                                        setIsStockModalOpen(true);
                                                                    }}
                                                                    className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 transition mr-2"
                                                                    title="Add Stock"
                                                                >
                                                                    <PlusCircle size={12} /> Add Stock
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingProduct(product);
                                                                        setProductFormData({
                                                                            supplier_id: product.supplier_id || '',
                                                                            inventory_category_id: product.inventory_category_id,
                                                                            name: product.name,
                                                                            unit: product.unit,
                                                                            current_stock: product.current_stock,
                                                                            reorder_level: product.reorder_level,
                                                                            price: product.price || '',
                                                                            description: product.description || '',
                                                                            is_active: product.is_active,
                                                                        });
                                                                        setIsProductModalOpen(true);
                                                                    }}
                                                                    className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-200 transition mr-2"
                                                                >
                                                                    <Pencil size={12} /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleProductDelete(product)}
                                                                    className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 transition"
                                                                >
                                                                    <Trash2 size={12} /> Delete
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Stock Transactions Tab */}
                        {activeTab === 'transactions' && (
                            <div>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-slate-900">Stock Transactions</h2>
                                        <p className="mt-1 text-sm text-slate-500">View all stock movements and transaction history.</p>
                                    </div>
                                </div>

                                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={transactionSearch}
                                            onChange={(e) => setTransactionSearch(e.target.value)}
                                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none"
                                        />
                                    </div>
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-500"
                                    >
                                        <option value="">All Types</option>
                                        <option value="IN">IN (Stock In)</option>
                                        <option value="OUT">OUT (Stock Out)</option>
                                    </select>
                                    <input
                                        type="date"
                                        value={filterFromDate}
                                        onChange={(e) => setFilterFromDate(e.target.value)}
                                        className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-500"
                                    />
                                    <input
                                        type="date"
                                        value={filterToDate}
                                        onChange={(e) => setFilterToDate(e.target.value)}
                                        className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                                    <p className="text-sm text-slate-500">
                                        Showing <span className="font-semibold text-slate-900">{filteredTransactions.length}</span> transaction{filteredTransactions.length === 1 ? '' : 's'}.
                                    </p>
                                </div>

                                {filteredTransactions.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                        <ClipboardList className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                                        <p className="text-sm font-semibold text-slate-700">No transactions found.</p>
                                        <p className="mt-2 text-sm text-slate-500">Stock transactions will appear here when stock is added or deducted.</p>
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: '0 12px 30px rgba(13,42,148,0.12)' }}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50">
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Date</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Product</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Type</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Quantity</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {filteredTransactions.map((transaction) => (
                                                        <tr key={transaction.id} className="hover:bg-slate-50 transition">
                                                            <td className="px-6 py-4 text-sm text-slate-700">
                                                                {new Date(transaction.transaction_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{transaction.product?.name || '-'}</td>
                                                            <td className="px-6 py-4">
                                                                {transaction.transaction_type === 'IN' ? (
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                                                                        <ArrowUpCircle size={14} /> IN
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
                                                                        <ArrowDownCircle size={14} /> OUT
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-semibold">
                                                                <span className={transaction.transaction_type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}>
                                                                    {transaction.transaction_type === 'IN' ? '+' : '-'}{transaction.quantity}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{transaction.remarks || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Product Requests Tab */}
                        {activeTab === 'requests' && (
                            <div>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-slate-900">Product Requests</h2>
                                        <p className="mt-1 text-sm text-slate-500">Approve or reject staff product requests for services.</p>
                                    </div>
                                    {pendingRequests > 0 && (
                                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                                            <AlertTriangle className="w-4 h-4" />
                                            {pendingRequests} Pending
                                        </div>
                                    )}
                                </div>

                                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by product or job order..."
                                            value={requestSearch}
                                            onChange={(e) => setRequestSearch(e.target.value)}
                                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none"
                                        />
                                    </div>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-500"
                                    >
                                        <option value="">All Status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                                    <p className="text-sm text-slate-500">
                                        Showing <span className="font-semibold text-slate-900">{filteredRequests.length}</span> request{filteredRequests.length === 1 ? '' : 's'}.
                                    </p>
                                </div>

                                {filteredRequests.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                        <ClipboardList className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                                        <p className="text-sm font-semibold text-slate-700">No product requests found.</p>
                                        <p className="mt-2 text-sm text-slate-500">Product requests from staff will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: '0 12px 30px rgba(13,42,148,0.12)' }}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50">
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Job Order</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Product</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Category</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Quantity</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Available Stock</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Date</th>
                                                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {filteredRequests.map((request) => {
                                                        const insufficientStock = request.product?.current_stock < request.quantity_used;
                                                        return (
                                                            <tr key={request.id} className="hover:bg-slate-50 transition">
                                                                <td className="px-6 py-4 text-sm font-semibold text-slate-900">#{request.job_order_id}</td>
                                                                <td className="px-6 py-4 text-sm font-semibold text-slate-900">{request.product?.name || '-'}</td>
                                                                <td className="px-6 py-4 text-sm text-slate-700">{request.product?.inventory_category?.name || '-'}</td>
                                                                <td className="px-6 py-4 text-sm font-semibold text-slate-900">{request.quantity_used} {request.product?.unit || 'pcs'}</td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={insufficientStock ? 'text-rose-600 font-semibold' : 'text-slate-900'}>
                                                                            {request.product?.current_stock || 0}
                                                                        </span>
                                                                        {insufficientStock && <AlertTriangle className="w-4 h-4 text-rose-600" />}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[request.status]}`}>
                                                                        {request.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-slate-700">{new Date(request.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    {request.status === 'Pending' && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleApprove(request)}
                                                                                disabled={insufficientStock}
                                                                                className={`inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 transition mr-2 ${insufficientStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                title={insufficientStock ? 'Insufficient stock' : 'Approve'}
                                                                            >
                                                                                <CheckCircle size={12} /> Approve
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleReject(request)}
                                                                                className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 transition mr-2"
                                                                                title="Reject"
                                                                            >
                                                                                <XCircle size={12} /> Reject
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteRequest(request)}
                                                                                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                                                                                title="Delete"
                                                                            >
                                                                                <X size={12} /> Delete
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {request.status !== 'Pending' && <span className="text-slate-400">-</span>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Category Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="rounded-3xl bg-white shadow-2xl max-w-md w-full">
                        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-3xl">
                            <h2 className="text-xl font-semibold text-slate-900">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
                            <button
                                onClick={() => setIsCategoryModalOpen(false)}
                                className="rounded-full p-2 text-slate-500 hover:bg-slate-200 transition"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCategorySubmit} className="space-y-4 p-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={categoryFormData.name}
                                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    value={categoryFormData.description}
                                    onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                    rows="3"
                                />
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="has_price" checked={categoryFormData.has_price} onChange={(e) => setCategoryFormData({ ...categoryFormData, has_price: e.target.checked })} className="mr-2 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor="has_price" className="text-sm text-slate-700">Has Price</label>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="deduct_on_service" checked={categoryFormData.deduct_on_service} onChange={(e) => setCategoryFormData({ ...categoryFormData, deduct_on_service: e.target.checked })} className="mr-2 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor="deduct_on_service" className="text-sm text-slate-700">Deduct on Service</label>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="is_asset" checked={categoryFormData.is_asset} onChange={(e) => setCategoryFormData({ ...categoryFormData, is_asset: e.target.checked })} className="mr-2 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor="is_asset" className="text-sm text-slate-700">Is Asset</label>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition">Cancel</button>
                                <button type="submit" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">{editingCategory ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Supplier Modal */}
            {isSupplierModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="rounded-3xl bg-white shadow-2xl max-w-md w-full">
                        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-3xl">
                            <h2 className="text-xl font-semibold text-slate-900">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
                            <button
                                onClick={() => setIsSupplierModalOpen(false)}
                                className="rounded-full p-2 text-slate-500 hover:bg-slate-200 transition"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSupplierSubmit} className="space-y-4 p-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={supplierFormData.name}
                                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
                                <input
                                    type="text"
                                    value={supplierFormData.contact}
                                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contact: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition">Cancel</button>
                                <button type="submit" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">{editingSupplier ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Product Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="rounded-3xl bg-white shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-3xl">
                            <h2 className="text-xl font-semibold text-slate-900">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                            <button
                                onClick={() => setIsProductModalOpen(false)}
                                className="rounded-full p-2 text-slate-500 hover:bg-slate-200 transition"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleProductSubmit} className="space-y-4 p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={productFormData.name}
                                        onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                    <select
                                        value={productFormData.inventory_category_id}
                                        onChange={(e) => setProductFormData({ ...productFormData, inventory_category_id: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>{category.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                                    <select
                                        value={productFormData.supplier_id}
                                        onChange={(e) => setProductFormData({ ...productFormData, supplier_id: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map((supplier) => (
                                            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                                    <input
                                        type="text"
                                        value={productFormData.unit}
                                        onChange={(e) => setProductFormData({ ...productFormData, unit: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Price {requiresPrice && <span className="text-rose-500">*</span>}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={productFormData.price}
                                        onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                        required={requiresPrice}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Stock</label>
                                    <input
                                        type="number"
                                        value={productFormData.current_stock}
                                        onChange={(e) => setProductFormData({ ...productFormData, current_stock: parseInt(e.target.value) || 0 })}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
                                    <input
                                        type="number"
                                        value={productFormData.reorder_level}
                                        onChange={(e) => setProductFormData({ ...productFormData, reorder_level: parseInt(e.target.value) || 0 })}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea
                                        value={productFormData.description}
                                        onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                        rows="3"
                                    />
                                </div>
                                <div className="col-span-2 flex items-center">
                                    <input type="checkbox" id="is_active" checked={productFormData.is_active} onChange={(e) => setProductFormData({ ...productFormData, is_active: e.target.checked })} className="mr-2 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                    <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsProductModalOpen(false)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition">Cancel</button>
                                <button type="submit" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">{editingProduct ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock Modal */}
            {isStockModalOpen && selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="rounded-3xl bg-white shadow-2xl max-w-md w-full">
                        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-3xl">
                            <h2 className="text-xl font-semibold text-slate-900">Add Stock</h2>
                            <button
                                onClick={() => setIsStockModalOpen(false)}
                                className="rounded-full p-2 text-slate-500 hover:bg-slate-200 transition"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleStockSubmit} className="space-y-4 p-6">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm text-slate-600">Product: <span className="font-semibold text-slate-900">{selectedProduct.name}</span></p>
                                <p className="text-sm text-slate-600">Current Stock: <span className="font-semibold text-slate-900">{selectedProduct.current_stock} {selectedProduct.unit}</span></p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={stockFormData.quantity}
                                    onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                                <textarea
                                    value={stockFormData.remarks}
                                    onChange={(e) => setStockFormData({ ...stockFormData, remarks: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                    rows="3"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsStockModalOpen(false)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition">Cancel</button>
                                <button type="submit" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition">Add Stock</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
