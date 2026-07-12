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

    const formatPhoneNumber = (value) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length === 0) return '';
        if (cleaned.length <= 3) return `+63 ${cleaned}`;
        if (cleaned.length <= 6) return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
        if (cleaned.length <= 10) return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
        return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
    };

    const handlePhoneChange = (e) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        setFormData(prev => ({
            ...prev,
            phone: rawValue,
        }));
    };

    return (
        <>
            <Head title="Complete Your Profile" />
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.7;
                    }
                }
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }
                @media (max-width: 1024px) {
                    .main-content {
                        grid-template-columns: 1fr !important;
                        gap: 40px !important;
                    }
                    .left-panel {
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        text-align: center !important;
                    }
                    .steps-container {
                        width: 100% !important;
                        max-width: 400px !important;
                    }
                    .quote-section {
                        width: 100% !important;
                        max-width: 400px !important;
                    }
                }
                @media (max-width: 768px) {
                    .container-responsive {
                        padding: 20px !important;
                    }
                    .card-responsive {
                        padding: 32px 24px !important;
                    }
                    .brand-title-responsive {
                        font-size: 28px !important;
                    }
                    .heading-responsive {
                        font-size: 24px !important;
                    }
                    .form-row-responsive {
                        grid-template-columns: 1fr !important;
                        gap: 16px !important;
                    }
                    .decorative-circle-1,
                    .decorative-circle-2,
                    .decorative-circle-3 {
                        display: none !important;
                    }
                }
                @media (max-width: 480px) {
                    .container-responsive {
                        padding: 16px !important;
                    }
                    .card-responsive {
                        padding: 24px 20px !important;
                        border-radius: 16px !important;
                    }
                    .brand-title-responsive {
                        font-size: 24px !important;
                    }
                    .heading-responsive {
                        font-size: 20px !important;
                    }
                    .subtitle-responsive {
                        font-size: 14px !important;
                    }
                    .icon-responsive {
                        width: 56px !important;
                        height: 56px !important;
                    }
                    .logo-container-responsive {
                        width: 64px !important;
                        height: 64px !important;
                    }
                    .logo-icon-responsive {
                        width: 36px !important;
                        height: 36px !important;
                    }
                    .step-number-responsive {
                        width: 32px !important;
                        height: 32px !important;
                        font-size: 14px !important;
                    }
                    .step-title-responsive {
                        font-size: 14px !important;
                    }
                    .step-description-responsive {
                        font-size: 12px !important;
                    }
                    .input-responsive {
                        padding: 12px 14px !important;
                        font-size: 14px !important;
                    }
                    .phone-input-responsive {
                        padding: 12px 14px !important;
                        font-size: 14px !important;
                    }
                    .button-responsive {
                        padding: 14px 20px !important;
                        font-size: 15px !important;
                    }
                }
            `}</style>
            <div style={styles.container} className="container container-responsive">
                <div style={styles.decorativeCircle1} className="decorative-circle-1" />
                <div style={styles.decorativeCircle2} className="decorative-circle-2" />
                <div style={styles.decorativeCircle3} className="decorative-circle-3" />
                
                <div style={styles.mainContent} className="main-content">
                    <div style={styles.leftPanel} className="left-panel">
                        <div style={styles.brandSection} className="brand-section">
                            <div style={styles.logoContainer} className="logo-container logo-container-responsive">
                                <svg style={styles.logoIcon} className="logo-icon logo-icon-responsive" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <h2 style={styles.brandTitle} className="brand-title brand-title-responsive">Car Services</h2>
                            <p style={styles.brandSubtitle} className="brand-subtitle">Premium Automotive Solutions</p>
                        </div>

                        <div style={stepsContainer} className="steps-container">
                            <div style={stepItem} className="step-item">
                                <div style={stepNumber} className="step-number step-number-responsive">1</div>
                                <div style={stepContent} className="step-content">
                                    <h3 style={stepTitle} className="step-title step-title-responsive">Complete Profile</h3>
                                    <p style={stepDescription} className="step-description step-description-responsive">Fill in your personal information</p>
                                </div>
                            </div>
                            <div style={stepItem} className="step-item">
                                <div style={{...stepNumber, ...stepNumberActive}} className="step-number step-number-active step-number-responsive">2</div>
                                <div style={stepContent} className="step-content">
                                    <h3 style={stepTitle} className="step-title step-title-responsive">Face Registration</h3>
                                    <p style={stepDescription} className="step-description step-description-responsive">Register your face for secure access</p>
                                </div>
                            </div>
                            <div style={stepItem} className="step-item">
                                <div style={stepNumber} className="step-number step-number-responsive">3</div>
                                <div style={stepContent} className="step-content">
                                    <h3 style={stepTitle} className="step-title step-title-responsive">Start Booking</h3>
                                    <p style={stepDescription} className="step-description step-description-responsive">Begin scheduling your services</p>
                                </div>
                            </div>
                        </div>

                        <div style={styles.quoteSection} className="quote-section">
                            <svg style={styles.quoteIcon} className="quote-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                            </svg>
                            <p style={styles.quoteText} className="quote-text">
                                Excellence is not a skill, it's an attitude.
                            </p>
                            <p style={styles.quoteAuthor} className="quote-author">- Ralph Marston</p>
                        </div>
                    </div>

                    <div style={styles.rightPanel} className="right-panel">
                        <div style={styles.card} className="card card-responsive">
                            <div style={styles.iconContainer} className="icon-container">
                                <svg style={styles.icon} className="icon icon-responsive" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" fill="url(#gradient1)"/>
                                    <path d="M12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="url(#gradient1)"/>
                                    <defs>
                                        <linearGradient id="gradient1" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#667eea"/>
                                            <stop offset="1" stopColor="#764ba2"/>
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <h1 style={styles.heading} className="heading heading-responsive">Complete Your Profile</h1>
                            <p style={styles.subtitle} className="subtitle subtitle-responsive">
                                Welcome, <span style={styles.highlight} className="highlight">{user.name}</span>! Please provide your contact information to continue with your registration.
                            </p>

                            {error && <div style={styles.error}>{error}</div>}
                            {success && <div style={styles.success}>{success}</div>}

                            <form onSubmit={handleSubmit} style={styles.form} className="form">
                                <div style={styles.formRow} className="form-row form-row-responsive">
                                    <div style={styles.formGroup} className="form-group">
                                        <label style={styles.label}>First Name</label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            placeholder="Enter your first name"
                                            required
                                            style={styles.input}
                                            className="input input-responsive"
                                        />
                                    </div>

                                    <div style={styles.formGroup} className="form-group">
                                        <label style={styles.label}>Last Name</label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            placeholder="Enter your last name"
                                            required
                                            style={styles.input}
                                            className="input input-responsive"
                                        />
                                    </div>
                                </div>

                                <div style={styles.formGroup} className="form-group">
                                    <label style={styles.label}>Phone Number</label>
                                    <div style={styles.phoneInputWrapper} className="phone-input-wrapper">
                                        <span style={styles.phonePrefix} className="phone-prefix">+63</span>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handlePhoneChange}
                                            placeholder="9XX XXX XXXX"
                                            required
                                            style={styles.phoneInput}
                                            className="phone-input phone-input-responsive"
                                            maxLength={10}
                                        />
                                    </div>
                                    <span style={styles.helperText} className="helper-text">Format: 9XX XXX XXXX (10 digits)</span>
                                </div>

                                <div style={styles.formGroup} className="form-group">
                                    <label style={styles.label}>Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Enter your complete address"
                                        required
                                        style={styles.input}
                                        className="input input-responsive"
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
                                    className="button button-responsive"
                                >
                                    {loading ? (
                                        <span style={styles.buttonContent}>
                                            <svg style={styles.spinner} viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3"/>
                                                <path d="M12 2C6.48 2 2 6.48 2 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                                            </svg>
                                            Saving...
                                        </span>
                                    ) : 'Continue to Face Registration'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

const stepsContainer = {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    marginTop: '48px',
};

const stepItem = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
};

const stepNumber = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    flexShrink: 0,
};

const stepNumberActive = {
    background: '#ffffff',
    color: '#667eea',
    boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4)',
};

const stepContent = {
    flex: 1,
};

const stepTitle = {
    margin: '0 0 4px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
};

const stepDescription = {
    margin: 0,
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.7)',
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        position: 'relative',
        overflow: 'hidden',
    },
    decorativeCircle1: {
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)',
        top: '-200px',
        left: '-200px',
        animation: 'float 6s ease-in-out infinite',
    },
    decorativeCircle2: {
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.08)',
        bottom: '-150px',
        right: '-100px',
        animation: 'float 8s ease-in-out infinite 2s',
    },
    decorativeCircle3: {
        position: 'absolute',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.06)',
        top: '50%',
        right: '10%',
        animation: 'float 10s ease-in-out infinite 4s',
    },
    mainContent: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '60px',
        maxWidth: '1200px',
        width: '100%',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
    },
    leftPanel: {
        animation: 'slideInLeft 0.8s ease-out',
    },
    rightPanel: {
        animation: 'slideInRight 0.8s ease-out',
    },
    brandSection: {
        marginBottom: '32px',
    },
    logoContainer: {
        width: '80px',
        height: '80px',
        background: 'rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        backdropFilter: 'blur(10px)',
    },
    logoIcon: {
        width: '48px',
        height: '48px',
        color: '#ffffff',
    },
    brandTitle: {
        margin: '0 0 8px',
        fontSize: '36px',
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: '-0.5px',
    },
    brandSubtitle: {
        margin: 0,
        fontSize: '16px',
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '400',
    },
    quoteSection: {
        marginTop: '48px',
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        backdropFilter: 'blur(10px)',
    },
    quoteIcon: {
        width: '32px',
        height: '32px',
        color: 'rgba(255, 255, 255, 0.4)',
        marginBottom: '16px',
    },
    quoteText: {
        margin: '0 0 8px',
        fontSize: '18px',
        fontStyle: 'italic',
        color: '#ffffff',
        lineHeight: '1.6',
    },
    quoteAuthor: {
        margin: 0,
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.6)',
    },
    card: {
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.25)',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeInUp 0.8s ease-out',
    },
    iconContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '24px',
        animation: 'fadeInUp 0.8s ease-out 0.2s',
        animationFillMode: 'both',
    },
    icon: {
        width: '72px',
        height: '72px',
    },
    heading: {
        margin: '0 0 12px',
        fontSize: '32px',
        fontWeight: '700',
        color: '#1f2937',
        textAlign: 'center',
        letterSpacing: '-0.5px',
        animation: 'fadeInUp 0.8s ease-out 0.3s',
        animationFillMode: 'both',
    },
    subtitle: {
        margin: '0 0 32px',
        fontSize: '15px',
        color: '#6b7280',
        lineHeight: '1.6',
        textAlign: 'center',
        animation: 'fadeInUp 0.8s ease-out 0.4s',
        animationFillMode: 'both',
    },
    highlight: {
        color: '#667eea',
        fontWeight: '600',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        animation: 'fadeInUp 0.8s ease-out 0.5s',
        animationFillMode: 'both',
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
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
        color: '#374151',
        letterSpacing: '0.3px',
    },
    input: {
        padding: '14px 16px',
        fontSize: '15px',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
        outline: 'none',
    },
    phoneInputWrapper: {
        display: 'flex',
        alignItems: 'center',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
    },
    phonePrefix: {
        padding: '14px 16px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#6b7280',
        background: '#f9fafb',
        borderRight: '2px solid #e5e7eb',
        fontFamily: 'inherit',
    },
    phoneInput: {
        padding: '14px 16px',
        fontSize: '15px',
        border: 'none',
        borderRadius: '0',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        outline: 'none',
        flex: 1,
    },
    helperText: {
        fontSize: '12px',
        color: '#9ca3af',
        marginTop: '4px',
    },
    button: {
        padding: '16px 24px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#ffffff',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        marginTop: '8px',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.39)',
    },
    buttonContent: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    spinner: {
        width: '20px',
        height: '20px',
        animation: 'spin 1s linear infinite',
    },
    error: {
        padding: '14px 16px',
        background: '#fef2f2',
        color: '#dc2626',
        borderRadius: '12px',
        marginBottom: '24px',
        fontSize: '14px',
        border: '1px solid #fecaca',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    success: {
        padding: '14px 16px',
        background: '#f0fdf4',
        color: '#16a34a',
        borderRadius: '12px',
        marginBottom: '24px',
        fontSize: '14px',
        border: '1px solid #bbf7d0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
};
