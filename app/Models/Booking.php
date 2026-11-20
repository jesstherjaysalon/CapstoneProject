<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\BookingService;
use App\Models\Payment;
use App\Models\Profile;

class Booking extends Model
{
    use HasFactory;

    protected $table = 'bookings';

    protected $casts = [
        'date' => 'date',
        'cancellation_paid_amount' => 'decimal:2',
        'cancellation_fee' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'cancelled_at' => 'datetime',
    ];

    protected $fillable = [
        'profile_id',
        'vehicle_id',
        'date',
        'status',
        'rating',
        'feedback',
        'cancellation_paid_amount',
        'cancellation_fee',
        'refund_amount',
        'cancelled_at',
    ];

    public function profile()
    {
        return $this->belongsTo(Profile::class, 'profile_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    public function services()
    {
        return $this->hasMany(BookingService::class, 'booking_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'booking_id');
    }

    public function manualPayments()
    {
        return $this->hasMany(ManualPayment::class, 'booking_id');
    }
}
