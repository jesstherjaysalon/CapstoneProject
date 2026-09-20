<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\FaceRecognitionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete('/profile', [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->delete('/profile', [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/profile');

        $this->assertNotNull($user->fresh());
    }

    public function test_customer_face_registration_quality_failure_returns_inertia_validation_error(): void
    {
        $user = User::factory()->create();
        $user->profile()->create([
            'first_name' => 'Test',
            'last_name' => 'User',
            'phone' => '09123456789',
            'address' => 'Test Address',
        ]);

        $file = UploadedFile::fake()->image('face.jpg');
        $route = URL::temporarySignedRoute(
            'customer.face.store',
            now()->addMinutes(5),
            ['user' => $user->id]
        );

        $mock = \Mockery::mock(FaceRecognitionService::class);
        $mock->shouldReceive('encodeFromPath')->once()->andThrow(new \RuntimeException('Image is too blurry. Please adjust and try again.'));
        $this->app->instance(FaceRecognitionService::class, $mock);

        $response = $this->post($route, ['face_image' => $file]);

        $response
            ->assertSessionHasErrors('face_image')
            ->assertSessionHas('errors');

        $messages = session('errors')->get('face_image');
        $messageText = is_array($messages) ? implode(' ', $messages) : (string) $messages;

        $this->assertStringContainsString('Image is too blurry', $messageText);
    }
}
