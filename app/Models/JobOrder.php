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
        'queue_number',
        'queue_priority',
        'queue_date',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'queue_date' => 'date',
        'profile_id' => 'array',
    ];

    public function bookingService()
    {
        return $this->belongsTo(BookingService::class);
    }

    public function getStaffAttribute()
    {
        $profileIds = $this->profile_id ?? [];
        if (!is_array($profileIds) || empty($profileIds)) {
            return collect();
        }
        return Profile::whereIn('id', $profileIds)->with('user')->get();
    }

    public function getStaffNamesAttribute()
    {
        $staff = $this->staff;
        return $staff->isNotEmpty() ? $staff->pluck('user.name')->join(', ') : 'Unassigned';
    }
}
