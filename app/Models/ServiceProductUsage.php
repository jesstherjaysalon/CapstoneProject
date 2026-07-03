<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class ServiceProductUsage extends Model
{
    use HasFactory;

    protected $table = 'service_product_usage';

    protected $fillable = [
        'job_order_id',
        'product_id',
        'quantity_used',
        'status',
        'returned_at',
    ];

    protected $casts = [
        'quantity_used' => 'integer',
        'returned_at' => 'datetime',
    ];

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'Pending');
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', 'Approved');
    }

    public function scopeRejected(Builder $query): Builder
    {
        return $query->where('status', 'Rejected');
    }

    public function scopeReturned(Builder $query): Builder
    {
        return $query->whereNotNull('returned_at');
    }

    public function isReturned(): bool
    {
        return $this->returned_at !== null;
    }
}
