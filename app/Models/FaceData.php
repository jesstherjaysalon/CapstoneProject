<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FaceData extends Model
{
    use HasFactory;

    protected $table = 'face_data';

    protected $fillable = [
        'profile_id',
        'face_image_path',
        'face_encoding',
        'registered_date',
    ];

    protected $casts = [
        'face_encoding' => 'array',
        'registered_date' => 'datetime',
    ];

    public function profile(): BelongsTo
    {
        return $this->belongsTo(Profile::class);
    }
}
