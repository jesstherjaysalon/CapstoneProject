<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_service_id',
        'profile_id',
        'start_time',
        'end_time',
        'status',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    public function bookingService()
    {
        return $this->belongsTo(BookingService::class);
    }

    public function profile()
    {
        return $this->belongsTo(Profile::class);
    }

    public function staff()
    {
        return $this->profile()->with('user');
    }
}
