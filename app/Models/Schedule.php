<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Schedule extends Model
{
    use HasFactory;

    protected $table = 'schedules';

    protected $fillable = [
        'operating_days',
        'business_hours_start',
        'business_hours_end',
        'max_bookings_per_day',
    ];

    protected $casts = [
        'operating_days' => 'array',
    ];

    protected function businessHoursStart(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? substr($value, 0, 5) : null,
            set: fn ($value) => $value ? substr($value, 0, 5) : null,
        );
    }

    protected function businessHoursEnd(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? substr($value, 0, 5) : null,
            set: fn ($value) => $value ? substr($value, 0, 5) : null,
        );
    }
}