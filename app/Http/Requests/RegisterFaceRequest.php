<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class RegisterFaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->route('user');

        return $user instanceof User && in_array($user->role, ['Staff', 'Customer']);
    }

    public function rules(): array
    {
        return [
            'face_image' => ['required', 'image', 'mimes:jpeg,png,jpg', 'max:5120'],
        ];
    }
}
