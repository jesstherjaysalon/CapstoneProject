import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import formatQuantityWithUnit from '@/utils/formatQuantityWithUnit';
import { 
    Plus, Pencil, Trash2, Package, Truck, Box, Search, X, Check, 
    ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle, AlertTriangle, 
    ClipboardList, TrendingDown, Clock
} from 'lucide-react';

const TABLE_ROWS_PER_PAGE = 10;

const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

function getPageItems(items, page) {
    const rows = Array.isArray(items) ? items : [];
    const safePage = Math.min(page, getPageCount(rows));
    const start = (safePage - 1) * TABLE_ROWS_PER_PAGE;
    return rows.slice(start, start + TABLE_ROWS_PER_PAGE);
}

function getPageCount(items) {
    const totalItems = Array.isArray(items) ? items.length : 0;
    return Math.max(1, Math.ceil(totalItems / TABLE_ROWS_PER_PAGE));
}

function PaginationControls({ currentPage, totalItems, totalPages, onPageChange }) {
    const safePage = Math.min(currentPage, totalPages);
    const startItem = totalItems === 0 ? 0 : ((safePage - 1) * TABLE_ROWS_PER_PAGE) + 1;
    const endItem = Math.min(safePage * TABLE_ROWS_PER_PAGE, totalItems);

    return (
        <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600">Showing {startItem} - {endItem} of {totalItems}</p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, safePage - 1))}
                    disabled={safePage === 1}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Previous
                </button>
                <span className="text-xs font-medium text-slate-700">Page {safePage} / {totalPages}</span>
                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
                    disabled={safePage === totalPages}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export default function InventoryManagement({ auth, module = null }) {
    const [activeTab, setActiveTab] = useState(module === 'overview' ? 'history' : module || 'categories');
    
    // Categories State
    const [categories, setCategories] = useState([]);
    const [categorySearch, setCategorySearch] = useState('');
    const [categoryPage, setCategoryPage] = useState(1);
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
    const [supplierPage, setSupplierPage] = useState(1);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [supplierFormData, setSupplierFormData] = useState({
        name: '',
        contact: '',
    });

    // Products State
    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [productPage, setProductPage] = useState(1);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productUsageHistory, setProductUsageHistory] = useState([]);
    const [usageProduct, setUsageProduct] = useState(null);
    const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
    const [isUsageHistoryLoading, setIsUsageHistoryLoading] = useState(false);
    const [usageHistoryError, setUsageHistoryError] = useState('');
    const [usageHistoryPage, setUsageHistoryPage] = useState(1);
    const [allInventoryHistory, setAllInventoryHistory] = useState([]);
    const [inventoryHistoryPage, setInventoryHistoryPage] = useState(1);
    const [productSalesReport, setProductSalesReport] = useState([]);
    const [productSalesPage, setProductSalesPage] = useState(1);
    const [lowStockCount, setLowStockCount] = useState(0);
    const [productFormData, setProductFormData] = useState({
        supplier_id: '',
        inventory_category_id: '',
        name: '',
        unit: 'pcs',
        reorder_level: 10,
        price: '',
        description: '',
        is_active: true,
    });
    // Stock Transactions State
    const [transactions, setTransactions] = useState([]);
    const [transactionSearch, setTransactionSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');
    const [transactionPage, setTransactionPage] = useState(1);

    // Product Requests State
    const [requests, setRequests] = useState([]);
    const [requestSearch, setRequestSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [requestPage, setRequestPage] = useState(1);

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

    const fetchProductUsageHistory = async (productId) => {
        setIsUsageHistoryLoading(true);
        setUsageHistoryError('');
        try {
            const response = await fetch(`/admin/service-product-usage?product_id=${productId}`, {
                headers: { 'Accept': 'application/json' },
            });
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            const data = await response.json();
            const history = data.data || data;
            setProductUsageHistory(Array.isArray(history) ? history : []);
        } catch (error) {
            console.error('Error fetching product usage history:', error);
            setProductUsageHistory([]);
            setUsageHistoryError('Unable to load product usage history. Please try again.');
        } finally {
            setIsUsageHistoryLoading(false);
        }
    };

    const fetchInventoryHistory = async () => {
        try {
            const response = await fetch('/admin/service-product-usage', {
                headers: { 'Accept': 'application/json' },
            });
            const data = await response.json();
            const history = data.data || data;
            setAllInventoryHistory(Array.isArray(history) ? history : []);
        } catch (error) {
            console.error('Error fetching inventory history:', error);
            setAllInventoryHistory([]);
        }
    };

    const fetchProductSalesReport = async () => {
        try {
            const response = await fetch('/admin/reports/consumable-product-sales', {
                headers: { 'Accept': 'application/json' },
            });
            const data = await response.json();
            setProductSalesReport(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            console.error('Error fetching product sales report:', error);
            setProductSalesReport([]);
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchSuppliers();
        fetchProducts();
        fetchTransactions();
        fetchRequests();
        fetchProductSalesReport();
        fetchInventoryHistory();
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
        const referenceNumber = transaction.reference_number?.toLowerCase() || '';
        return productName.includes(searchLower) || remarks.includes(searchLower) || referenceNumber.includes(searchLower);
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
        { id: 'history', label: 'Inventory History', icon: ClipboardList },
        { id: 'transactions', label: 'Stock Transactions', icon: ArrowUpCircle },
        { id: 'requests', label: 'Product Requests', icon: CheckCircle },
    ];

    const statusClasses = {
        Pending: 'bg-amber-100 text-amber-800',
        Approved: 'bg-emerald-100 text-emerald-800',
        Rejected: 'bg-rose-100 text-rose-800',
    };

    const pendingRequests = Array.isArray(requests) ? requests.filter(r => r.status === 'Pending').length : 0;

    const paginatedCategories = getPageItems(filteredCategories, categoryPage);
    const paginatedSuppliers = getPageItems(filteredSuppliers, supplierPage);
    const paginatedProducts = getPageItems(filteredProducts, productPage);
    const paginatedTransactions = getPageItems(filteredTransactions, transactionPage);
    const paginatedRequests = getPageItems(filteredRequests, requestPage);
    const paginatedSalesReport = getPageItems(productSalesReport, productSalesPage);
    const inventoryHistoryTotalPages = getPageCount(allInventoryHistory);
    const paginatedInventoryHistory = useMemo(
        () => getPageItems(Array.isArray(allInventoryHistory) ? allInventoryHistory : [], inventoryHistoryPage),
        [allInventoryHistory, inventoryHistoryPage]
    );
    const productUsageTotalPages = getPageCount(productUsageHistory);
    const paginatedProductUsageHistory = useMemo(() => {
        return getPageItems(productUsageHistory, usageHistoryPage);
    }, [productUsageHistory, usageHistoryPage]);
    const categoryTotalPages = getPageCount(filteredCategories);
    const supplierTotalPages = getPageCount(filteredSuppliers);
    const productTotalPages = getPageCount(filteredProducts);
    const transactionTotalPages = getPageCount(filteredTransactions);
    const requestTotalPages = getPageCount(filteredRequests);
    const productSalesTotalPages = getPageCount(productSalesReport);

    useEffect(() => {
        setInventoryHistoryPage(1);
    }, [activeTab]);

    useEffect(() => {
        if (module) setActiveTab(module === 'overview' ? 'history' : module);
    }, [module]);

    const pageTitle = module
        ? { overview: 'Inventory Overview', categories: 'Inventory Categories', suppliers: 'Suppliers', products: 'Products' }[module] || 'Inventory Management'
        : 'Inventory Management';
    const visibleTabs = module === 'overview'
        ? tabs.filter((tab) => !['categories', 'suppliers', 'products'].includes(tab.id))
        : tabs;

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">{pageTitle}</h2>}>
            <Head title={pageTitle} />

            <div className="space-y-6 py-6 px-4">
                {/* Page Title Container */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                {module === 'categories' && 'Organize inventory products and category-level settings.'}
                                {module === 'suppliers' && 'Manage supplier details used by products and receiving.'}
                                {module === 'products' && 'Manage product details and monitor available inventory stock.'}
                                {module === 'overview' && 'Review inventory history, stock movements, and product requests.'}
                                {!module && 'Manage inventory categories, suppliers, products, stock transactions, and product requests.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                {(!module || module === 'overview') && <div className="grid gap-4 md:grid-cols-4">
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
                </div>}

                {/* Main Content Container */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                    {/* Tabs */}
                    {(!module || module === 'overview') && <div className="border-b border-slate-200">
                        <nav className="flex -mb-px gap-1">
                            {visibleTabs.map((tab) => {
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
                    </div>}

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
                                        onChange={(e) => {
                                            setCategorySearch(e.target.value);
                                            setCategoryPage(1);
                                        }}
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
                                                    {paginatedCategories.map((category) => (
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
                                        <PaginationControls
                                            currentPage={categoryPage}
                                            totalItems={filteredCategories.length}
                                            totalPages={categoryTotalPages}
                                            onPageChange={setCategoryPage}
                                        />
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
                                        onChange={(e) => {
                                            setSupplierSearch(e.target.value);
                                            setSupplierPage(1);
                                        }}
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
                                                    {paginatedSuppliers.map((supplier) => (
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
                                        <PaginationControls
                                            currentPage={supplierPage}
                                            totalItems={filteredSuppliers.length}
                                            totalPages={supplierTotalPages}
                                            onPageChange={setSupplierPage}
                                        />
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
                                        onChange={(e) => {
                                            setProductSearch(e.target.value);
                                            setProductPage(1);
                                        }}
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
                                                    {paginatedProducts.map((product) => (
                                                        <tr key={product.id} className="hover:bg-slate-50 transition">
                                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{product.name}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{product.inventory_category?.name || '-'}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{product.supplier?.name || '-'}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={product.current_stock <= product.reorder_level ? 'text-rose-600 font-semibold' : 'text-slate-900'}>
                                                                        {formatQuantityWithUnit(product.current_stock, product.unit)}
                                                                    </span>
                                                                    {product.current_stock <= product.reorder_level && (
                                                                        <AlertTriangle className="w-4 h-4 text-rose-600" title="Low stock" />
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{product.price ? formatCurrency(product.price) : '-'}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${product.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                                                    {product.is_active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                <button
                                                                    onClick={() => {
                                                                        setUsageProduct(product);
                                                                        setProductUsageHistory([]);
                                                                        setUsageHistoryPage(1);
                                                                        setIsUsageModalOpen(true);
                                                                        fetchProductUsageHistory(product.id);
                                                                    }}
                                                                    className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-200 transition mr-2"
                                                                >
                                                                    Usage
                                                                </button>
                                                                <a
                                                                    href={`/admin/inventory/receiving?product_id=${product.id}`}
                                                                    className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 transition mr-2"
                                                                    title="Receive stock"
                                                                >
                                                                    Receive
                                                                </a>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingProduct(product);
                                                                        setProductFormData({
                                                                            supplier_id: product.supplier_id || '',
                                                                            inventory_category_id: product.inventory_category_id,
                                                                            name: product.name,
                                                                            unit: product.unit,
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
                                        <PaginationControls
                                            currentPage={productPage}
                                            totalItems={filteredProducts.length}
                                            totalPages={productTotalPages}
                                            onPageChange={setProductPage}
                                        />
                                    </div>
                                )}

                                {productSalesReport.length > 0 && (
                                    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5" style={{ boxShadow: '0 12px 30px rgba(13,42,148,0.12)' }}>
                                        <div className="mb-4 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900">Sales Report</h3>
                                                <p className="text-sm text-slate-500">Approved product sales tied to service appointments and customers.</p>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-white">
                                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Product</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Customer</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Staff</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Service</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Qty</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 bg-white">
                                                    {paginatedSalesReport.map((sale) => (
                                                        <tr key={sale.usage_id || sale.product_id + '-' + sale.booking_id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">{sale.product_name || sale.name || 'Product'}</td>
                                                            <td className="px-4 py-3 text-sm text-slate-700">{sale.customer_name || 'Unknown'}</td>
                                                            <td className="px-4 py-3 text-sm text-slate-700">{sale.staff_name || 'Unassigned'}</td>
                                                            <td className="px-4 py-3 text-sm text-slate-700">{sale.service_name || 'Service'}</td>
                                                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">{sale.quantity_used || 0}</td>
                                                            <td className="px-4 py-3 text-sm font-semibold text-emerald-700">{formatCurrency(sale.total_sales)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <PaginationControls
                                            currentPage={productSalesPage}
                                            totalItems={productSalesReport.length}
                                            totalPages={productSalesTotalPages}
                                            onPageChange={setProductSalesPage}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Inventory History Tab */}
                        {activeTab === 'history' && (
                            <div>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-slate-900">Inventory History</h2>
                                        <p className="mt-1 text-sm text-slate-500">Track all product usage across services, customers, vehicles, and job orders.</p>
                                    </div>
                                </div>

                                {allInventoryHistory.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                        <ClipboardList className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                                        <p className="text-sm font-semibold text-slate-700">No inventory history yet.</p>
                                        <p className="mt-2 text-sm text-slate-500">Product usage records will appear here when staff request or use inventory.</p>
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: '0 12px 30px rgba(13,42,148,0.12)' }}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[1100px] text-[11px]">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50">
                                                        <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">Date</th>
                                                        <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">Product</th>
                                                        <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">Type</th>
                                                        <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">Qty</th>
                                                        <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">Job Order</th>
                                                        <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">Category</th>
                                                        <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">Vehicle</th>
                                                        <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">Customer</th>
                                                        <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">Service</th>
                                                        <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">Stock</th>
                                                        <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-600">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 bg-white">
                                                    {paginatedInventoryHistory.map((usage) => {
                                                        const booking = usage.job_order?.booking_service?.booking;
                                                        const vehicle = booking?.vehicle;
                                                        const vehicleLabel = vehicle
                                                            ? `${vehicle.brand || 'Unknown'} ${vehicle.model || ''} • ${vehicle.plate_number || 'No plate'}`.trim()
                                                            : 'No vehicle';
                                                        const customerName = booking?.profile
                                                            ? `${booking.profile.first_name || ''} ${booking.profile.last_name || ''}`.trim() || 'Unknown customer'
                                                            : 'Unknown customer';
                                                        const jobOrderUserName = usage.staff_names || 'Unassigned';
                                                        const serviceName = usage.job_order?.booking_service?.service?.name || 'Service';
                                                        const productCategory = usage.product?.inventory_category?.name || 'Uncategorized';
                                                        const bookingDate = usage.created_at
                                                            ? new Date(usage.created_at).toLocaleString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                                hour: 'numeric',
                                                                minute: '2-digit',
                                                            })
                                                            : 'N/A';
                                                        const availableStock = usage.product?.current_stock ?? 0;

                                                        return (
                                                            <tr key={usage.id} className="hover:bg-slate-50 align-top">
                                                                <td className="px-2 py-2 text-slate-700">{bookingDate}</td>
                                                                <td className="px-2 py-2 font-semibold text-slate-900">{usage.product?.name || 'Product'}</td>
                                                                <td className="px-2 py-2 text-slate-700">
                                                                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                                                        Used
                                                                    </span>
                                                                </td>
                                                                <td className="px-2 py-2 font-semibold text-slate-900">{usage.quantity_used}</td>
                                                                <td className="px-2 py-2 font-semibold text-slate-900">#{usage.job_order_id}</td>
                                                                <td className="px-2 py-2 text-slate-700">{productCategory}</td>
                                                                <td className="px-2 py-2 text-slate-700">{vehicleLabel}</td>
                                                                <td className="px-2 py-2 text-slate-700">{customerName}</td>
                                                                <td className="px-2 py-2 text-slate-700">{serviceName}</td>
                                                                <td className="px-2 py-2 font-semibold text-slate-900">{availableStock}</td>
                                                                <td className="px-2 py-2 text-slate-700">
                                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClasses[usage.status] || 'bg-slate-100 text-slate-800'}`}>
                                                                        {usage.status}
                                                                    </span>
                                                                    <div className="mt-1 text-[10px] text-slate-500">Used by: {jobOrderUserName}</div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <PaginationControls
                                            currentPage={inventoryHistoryPage}
                                            totalItems={allInventoryHistory.length}
                                            totalPages={inventoryHistoryTotalPages}
                                            onPageChange={setInventoryHistoryPage}
                                        />
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
                                            onChange={(e) => {
                                                setTransactionSearch(e.target.value);
                                                setTransactionPage(1);
                                            }}
                                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none"
                                        />
                                    </div>
                                    <select
                                        value={filterType}
                                        onChange={(e) => {
                                            setFilterType(e.target.value);
                                            setTransactionPage(1);
                                        }}
                                        className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-500"
                                    >
                                        <option value="">All Types</option>
                                        <option value="IN">IN (Stock In)</option>
                                        <option value="OUT">OUT (Stock Out)</option>
                                    </select>
                                    <input
                                        type="date"
                                        value={filterFromDate}
                                        onChange={(e) => {
                                            setFilterFromDate(e.target.value);
                                            setTransactionPage(1);
                                        }}
                                        className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm focus:border-indigo-500"
                                    />
                                    <input
                                        type="date"
                                        value={filterToDate}
                                        onChange={(e) => {
                                            setFilterToDate(e.target.value);
                                            setTransactionPage(1);
                                        }}
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
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Reference</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {paginatedTransactions.map((transaction) => (
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
                                                            <td className="px-6 py-4 text-sm text-slate-700">{transaction.reference_number || '-'}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${transaction.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                                    {transaction.status || 'confirmed'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-700">{transaction.remarks || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <PaginationControls
                                            currentPage={transactionPage}
                                            totalItems={filteredTransactions.length}
                                            totalPages={transactionTotalPages}
                                            onPageChange={setTransactionPage}
                                        />
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
                                            onChange={(e) => {
                                                setRequestSearch(e.target.value);
                                                setRequestPage(1);
                                            }}
                                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none"
                                        />
                                    </div>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => {
                                            setFilterStatus(e.target.value);
                                            setRequestPage(1);
                                        }}
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
                                                    {paginatedRequests.map((request) => {
                                                        const insufficientStock = request.product?.current_stock < request.quantity_used;
                                                        return (
                                                            <tr key={request.id} className="hover:bg-slate-50 transition">
                                                                <td className="px-6 py-4 text-sm font-semibold text-slate-900">#{request.job_order_id}</td>
                                                                <td className="px-6 py-4 text-sm font-semibold text-slate-900">{request.product?.name || '-'}</td>
                                                                <td className="px-6 py-4 text-sm text-slate-700">{request.product?.inventory_category?.name || '-'}</td>
                                                                <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatQuantityWithUnit(request.quantity_used, request.product?.unit || 'pcs')}</td>
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
                                        <PaginationControls
                                            currentPage={requestPage}
                                            totalItems={filteredRequests.length}
                                            totalPages={requestTotalPages}
                                            onPageChange={setRequestPage}
                                        />
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
                            <p className="text-sm text-slate-500">Available stock starts at zero and is updated through confirmed receiving transactions.</p>
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

            {/* Product Usage Modal */}
            {isUsageModalOpen && usageProduct && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">Usage History</h2>
                                <p className="mt-1 text-sm text-slate-500">{usageProduct.name}</p>
                            </div>
                            <button
                                onClick={() => setIsUsageModalOpen(false)}
                                className="rounded-full p-2 text-slate-500 hover:bg-slate-200 transition"
                                aria-label="Close usage history"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                            {isUsageHistoryLoading ? (
                                <p className="p-8 text-center text-sm text-slate-500">Loading usage history...</p>
                            ) : usageHistoryError ? (
                                <div className="p-8 text-center">
                                    <p className="text-sm text-rose-600">{usageHistoryError}</p>
                                    <button
                                        onClick={() => fetchProductUsageHistory(usageProduct.id)}
                                        className="mt-3 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                                    >
                                        Try again
                                    </button>
                                </div>
                            ) : productUsageHistory.length === 0 ? (
                                <p className="p-8 text-center text-sm text-slate-500">No usage history for this product.</p>
                            ) : (
                                <table className="w-full table-fixed text-[10px]">
                                    <colgroup>
                                        <col style={{ width: '11%' }} />
                                        <col style={{ width: '10%' }} />
                                        <col style={{ width: '6%' }} />
                                        <col style={{ width: '5%' }} />
                                        <col style={{ width: '8%' }} />
                                        <col style={{ width: '8%' }} />
                                        <col style={{ width: '12%' }} />
                                        <col style={{ width: '11%' }} />
                                        <col style={{ width: '11%' }} />
                                        <col style={{ width: '6%' }} />
                                        <col style={{ width: '12%' }} />
                                    </colgroup>
                                    <thead className="sticky top-0 bg-white">
                                        <tr className="border-b border-slate-200">
                                            <th className="break-words px-1.5 py-2 text-left font-semibold uppercase tracking-wide text-slate-600 [overflow-wrap:anywhere]">Date</th>
                                            <th className="break-words px-1.5 py-2 text-left font-semibold uppercase tracking-wide text-slate-600 [overflow-wrap:anywhere]">Product</th>
                                            <th className="break-words px-1.5 py-2 text-left font-semibold uppercase tracking-wide text-slate-600 [overflow-wrap:anywhere]">Type</th>
                                            <th className="break-words px-1.5 py-2 text-left font-semibold uppercase tracking-wide text-slate-600 [overflow-wrap:anywhere]">Qty</th>
                                            <th className="break-words px-1.5 py-2 text-left font-semibold uppercase tracking-wide text-slate-600 [overflow-wrap:anywhere]">Job Order</th>
                                            <th className="break-words px-1.5 py-2 text-left font-semibold uppercase tracking-wide text-slate-600 [overflow-wrap:anywhere]">Category</th>
                                            <th className="break-words px-1.5 py-2 text-left font-semibold uppercase tracking-wide text-slate-600 [overflow-wrap:anywhere]">Vehicle</th>
                                            <th className="break-words px-1.5 py-2 text-left font-semibold uppercase tracking-wide text-slate-600 [overflow-wrap:anywhere]">Customer</th>
                                            <th className="break-words px-1.5 py-2 text-left font-semibold uppercase tracking-wide text-slate-600 [overflow-wrap:anywhere]">Service</th>
                                            <th className="break-words px-1.5 py-2 text-left font-semibold uppercase tracking-wide text-slate-600 [overflow-wrap:anywhere]">Stock</th>
                                            <th className="break-words px-1.5 py-2 text-left font-semibold uppercase tracking-wide text-slate-600 [overflow-wrap:anywhere]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                                        {paginatedProductUsageHistory.map((usage) => {
                                            const booking = usage.job_order?.booking_service?.booking;
                                            const vehicle = booking?.vehicle;
                                            const vehicleLabel = vehicle
                                                ? `${vehicle.brand || 'Unknown'} ${vehicle.model || ''} • ${vehicle.plate_number || 'No plate'}`.trim()
                                                : 'No vehicle';
                                            const customerName = booking?.profile
                                                ? `${booking.profile.first_name || ''} ${booking.profile.last_name || ''}`.trim() || 'Unknown customer'
                                                : 'Unknown customer';
                                            const jobOrderUserName = usage.staff_names || 'Unassigned';
                                            const serviceName = usage.job_order?.booking_service?.service?.name || 'Service';
                                            const productCategory = usage.product?.inventory_category?.name || 'Uncategorized';
                                            const bookingDate = usage.created_at
                                                ? new Date(usage.created_at).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                })
                                                : 'N/A';
                                            const availableStock = usage.product?.current_stock ?? 0;

                                            return (
                                                <tr key={usage.id} className="align-top hover:bg-slate-50">
                                                    <td className="break-words px-1.5 py-2 text-slate-700 [overflow-wrap:anywhere]">{bookingDate}</td>
                                                    <td className="break-words px-1.5 py-2 font-semibold text-slate-900 [overflow-wrap:anywhere]">{usage.product?.name || 'Product'}</td>
                                                    <td className="break-words px-1.5 py-2 text-slate-700 [overflow-wrap:anywhere]">
                                                        <span className="inline-block max-w-full break-words rounded-full bg-rose-100 px-1 py-0.5 text-[9px] font-semibold text-rose-700 [overflow-wrap:anywhere]">Used</span>
                                                    </td>
                                                    <td className="break-words px-1.5 py-2 font-semibold text-slate-900 [overflow-wrap:anywhere]">{usage.quantity_used}</td>
                                                    <td className="break-words px-1.5 py-2 font-semibold text-slate-900 [overflow-wrap:anywhere]">#{usage.job_order_id}</td>
                                                    <td className="break-words px-1.5 py-2 text-slate-700 [overflow-wrap:anywhere]">{productCategory}</td>
                                                    <td className="break-words px-1.5 py-2 text-slate-700 [overflow-wrap:anywhere]">{vehicleLabel}</td>
                                                    <td className="break-words px-1.5 py-2 text-slate-700 [overflow-wrap:anywhere]">{customerName}</td>
                                                    <td className="break-words px-1.5 py-2 text-slate-700 [overflow-wrap:anywhere]">{serviceName}</td>
                                                    <td className="break-words px-1.5 py-2 font-semibold text-slate-900 [overflow-wrap:anywhere]">{availableStock}</td>
                                                    <td className="break-words px-1.5 py-2 text-slate-700 [overflow-wrap:anywhere]">
                                                        <span className={`inline-block max-w-full break-words rounded-full px-1 py-0.5 text-[9px] font-semibold [overflow-wrap:anywhere] ${statusClasses[usage.status] || 'bg-slate-100 text-slate-800'}`}>
                                                            {usage.status}
                                                        </span>
                                                        <div className="mt-1 text-[9px] text-slate-500 [overflow-wrap:anywhere]">Used by: {jobOrderUserName}</div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <PaginationControls
                            currentPage={usageHistoryPage}
                            totalItems={productUsageHistory.length}
                            totalPages={productUsageTotalPages}
                            onPageChange={setUsageHistoryPage}
                        />
                    </div>
                </div>,
                document.body
            )}
        </AuthenticatedLayout>
    );
}
