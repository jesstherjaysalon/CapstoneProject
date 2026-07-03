<?php

namespace App\Http\Controllers;

use App\Models\StockTransaction;
use Illuminate\Http\Request;

class StockTransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = StockTransaction::with(['product.supplier', 'product.inventoryCategory']);

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->has('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        if ($request->has('from_date')) {
            $query->whereDate('transaction_date', '>=', $request->from_date);
        }

        if ($request->has('to_date')) {
            $query->whereDate('transaction_date', '<=', $request->to_date);
        }

        $transactions = $query->orderBy('transaction_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($transactions);
    }

    public function show(StockTransaction $stockTransaction)
    {
        $stockTransaction->load(['product.supplier', 'product.inventoryCategory']);
        return response()->json($stockTransaction);
    }
}
