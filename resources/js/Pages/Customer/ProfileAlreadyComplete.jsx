import { Head } from '@inertiajs/react';

export default function ProfileAlreadyComplete({ user }) {
    return (
        <>
            <Head title="Profile Already Complete" />
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.checkmark}>✓</div>
                    <h1 style={styles.heading}>Profile Already Complete</h1>
                    <p style={styles.subtitle}>
                        Hello {user.name}, your profile has already been completed. You're all set to start using Car Services!
                    </p>

                    <a href="/" style={styles.button}>
                        Return to Home
                    </a>
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
        textAlign: 'center',
    },
    checkmark: {
        fontSize: '64px',
        color: '#10b981',
        margin: '0 0 20px',
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
    button: {
        display: 'inline-block',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#ffffff',
        background: '#2563eb',
        textDecoration: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
};
