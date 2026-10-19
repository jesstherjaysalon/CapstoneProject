<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'name',
        'description',
        'price',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function bookings()
    {
        return $this->hasManyThrough(Booking::class, BookingService::class, 'service_id', 'id', 'id', 'booking_id');
    }

    public function bookingServices()
    {
        return $this->hasMany(BookingService::class, 'service_id');
    }

    public function getAverageRatingAttribute()
    {
        $completedServices = $this->bookingServices()
            ->where('status', 'completed')
            ->whereNotNull('rating')
            ->get();

        if ($completedServices->isEmpty()) {
            return 0;
        }

        $totalRating = $completedServices->sum('rating');
        $averageRating = $totalRating / $completedServices->count();

        return round($averageRating, 1);
    }
}
