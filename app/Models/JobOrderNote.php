<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobOrderNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_order_id',
        'note',
        'photos',
    ];

    protected $casts = [
        'photos' => 'array',
    ];

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class);
    }
}
