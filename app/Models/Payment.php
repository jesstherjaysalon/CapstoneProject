<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $table = 'payments';

    protected $fillable = [
        'booking_id',
        'payment_method',
        'amount',
        'amount_type',
        'status',
        'paymongo_source_id',
        'paymongo_source_status',
        'paymongo_payment_id',
        'paymongo_payment_status',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }
}
