import { useState } from 'react';
import { Head } from '@inertiajs/react';

export default function CompleteProfile({ user }) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        address: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const endpoint = `${window.location.origin}/customer/profile/complete/${user.id}${window.location.search}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(data.message);
                setTimeout(() => {
                    if (data.face_url) {
                        window.location.href = data.face_url;
                    } else {
                        window.location.href = window.location.href.replace('/profile/complete/', '/face/register/');
                    }
                }, 1500);
            } else {
                setError(data.message || 'Failed to save profile');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head title="Complete Your Profile" />
            <div style={styles.container}>
                <div style={styles.card}>
                    <h1 style={styles.heading}>Complete Your Profile</h1>
                    <p style={styles.subtitle}>
                        Hello {user.name}, please provide your contact information to continue.
                    </p>

                    {error && <div style={styles.error}>{error}</div>}
                    {success && <div style={styles.success}>{success}</div>}

                    <form onSubmit={handleSubmit} style={styles.form}>
                            <div style={styles.formGroup}>
                            <label style={styles.label}>First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                placeholder="First name"
                                required
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                placeholder="Last name"
                                required
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Phone Number</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+1 (555) 000-0000"
                                required
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Street address"
                                required
                                style={styles.input}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                ...styles.button,
                                opacity: loading ? 0.6 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? 'Saving...' : 'Continue to Face Registration'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fb',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
    },
    card: {
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 16px 32px rgba(15,23,42,0.08)',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
    },
    heading: {
        margin: '0 0 10px',
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#111827',
    },
    subtitle: {
        margin: '0 0 30px',
        fontSize: '16px',
        color: '#6b7280',
        lineHeight: '1.5',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#111827',
    },
    input: {
        padding: '10px 12px',
        fontSize: '16px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    },
    button: {
        padding: '12px 16px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#ffffff',
        background: '#2563eb',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        marginTop: '10px',
        transition: 'background-color 0.2s',
    },
    error: {
        padding: '12px 16px',
        background: '#fee2e2',
        color: '#991b1b',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '14px',
    },
    success: {
        padding: '12px 16px',
        background: '#dcfce7',
        color: '#166534',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '14px',
    },
};
