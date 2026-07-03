<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->enum('payment_method', ['gcash', 'maya']);
            $table->decimal('amount', 10, 2);
            $table->enum('amount_type', ['full', 'half']);
            $table->enum('status', ['pending', 'paid', 'failed'])->default('pending');
            $table->string('paymongo_source_id')->nullable();
            $table->string('paymongo_source_status')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('payments');
    }
};
