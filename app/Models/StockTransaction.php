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
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'quantity' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeIn(Builder $query): Builder
    {
        return $query->where('transaction_type', 'IN');
    }

    public function scopeOut(Builder $query): Builder
    {
        return $query->where('transaction_type', 'OUT');
    }
}
