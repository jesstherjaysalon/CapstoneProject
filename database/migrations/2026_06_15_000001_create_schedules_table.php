<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->json('operating_days')->comment('Days when the business operates (Mon-Sun)');
            $table->time('business_hours_start')->comment('Business opening time');
            $table->time('business_hours_end')->comment('Business closing time');
            $table->integer('max_bookings_per_day')->default(10)->comment('Maximum bookings allowed per day');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('schedules');
    }
};
