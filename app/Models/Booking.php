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
    ];

    protected $fillable = [
        'profile_id',
        'date',
        'status',
        'rating',
        'feedback',
    ];

    public function profile()
    {
        return $this->belongsTo(Profile::class, 'profile_id');
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
