<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Service;

class BookingService extends Model
{
    use HasFactory;

    protected $table = 'booking_services';

    protected $casts = [
        'scheduled_time' => 'string',
    ];

    protected $fillable = [
        'booking_id',
        'service_id',
        'status',
        'image',
        'rating',
        'scheduled_time',
    ];

    protected static function booted()
    {
        static::updated(function ($bookingService) {
            // Only check if status was changed to 'completed'
            if ($bookingService->wasChanged('status') && $bookingService->status === 'completed') {
                $bookingService->checkAndUpdateBookingStatus();
            }
        });
    }

    public function checkAndUpdateBookingStatus()
    {
        $booking = $this->booking;
        if (!$booking) {
            return;
        }

        // Check if all booking_services for this booking are completed
        $allServicesCompleted = $booking->services()
            ->where('status', '!=', 'completed')
            ->doesntExist();

        // If all services are completed, update booking status
        if ($allServicesCompleted) {
            $booking->update(['status' => 'completed']);
        }
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    public function service()
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    public function jobOrder()
    {
        return $this->hasOne(JobOrder::class);
    }
}
