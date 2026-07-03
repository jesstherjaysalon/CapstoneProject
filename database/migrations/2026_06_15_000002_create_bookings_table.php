<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('profile_id')->nullable()->index();
            $table->date('date')->comment('Booking date');
            $table->enum('status', ['pending','accepted','rejected','completed'])->default('pending');
            $table->integer('rating')->nullable()->comment('Overall booking rating');
            $table->text('feedback')->nullable()->comment('Customer feedback for the booking');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('bookings');
    }
};
