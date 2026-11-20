<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class StockTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'user_id',
        'transaction_type',
        'quantity',
        'transaction_date',
        'remarks',
        'receipt_id',
        'supplier_id',
        'reference_number',
        'unit_cost',
        'total_cost',
        'status',
        'confirmed_at',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'quantity' => 'integer',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'confirmed_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class)->withTrashed();
    }

    public function scopeIn(Builder $query): Builder
    {
        return $query->where('transaction_type', 'IN');
    }

    public function scopeOut(Builder $query): Builder
    {
        return $query->where('transaction_type', 'OUT');
    }

    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', 'confirmed');
    }

    public static function nextReceiptReferenceNumber(): string
    {
        $highestNumber = static::query()
            ->whereNotNull('receipt_id')
            ->whereNotNull('reference_number')
            ->distinct()
            ->pluck('reference_number')
            ->filter(fn ($reference) => preg_match('/^\d+$/', (string) $reference) === 1)
            ->map(fn ($reference) => (int) $reference)
            ->max() ?? 0;

        return str_pad((string) ($highestNumber + 1), 6, '0', STR_PAD_LEFT);
    }
}
