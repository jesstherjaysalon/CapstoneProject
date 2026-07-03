<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ManualPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'amount',
        'receipt_number',
        'remarks',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
