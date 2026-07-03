<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'has_price',
        'deduct_on_service',
        'is_asset',
    ];

    protected $casts = [
        'has_price' => 'boolean',
        'deduct_on_service' => 'boolean',
        'is_asset' => 'boolean',
    ];

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
