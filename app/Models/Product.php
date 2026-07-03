<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'supplier_id',
        'inventory_category_id',
        'name',
        'unit',
        'current_stock',
        'reorder_level',
        'price',
        'description',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'current_stock' => 'integer',
        'reorder_level' => 'integer',
        'is_active' => 'boolean',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function inventoryCategory()
    {
        return $this->belongsTo(InventoryCategory::class);
    }

    public function stockTransactions()
    {
        return $this->hasMany(StockTransaction::class);
    }

    public function serviceProductUsages()
    {
        return $this->hasMany(ServiceProductUsage::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('current_stock', '<=', 'reorder_level');
    }

    public function isBelowReorderLevel(): bool
    {
        return $this->current_stock <= $this->reorder_level;
    }
}
