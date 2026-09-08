import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: 24,
        position: 'relative',
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: 420 }} className="slide-up">
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={22} color="white" />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>SaaSKit</span>
        </div>

        <Card padding="32px">
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              textAlign: 'center',
              marginBottom: 28,
            }}
          >
            Sign in to your account
          </p>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--danger-subtle)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" loading={loading} style={{ width: '100%', marginTop: 4 }}>
              Sign In
            </Button>
          </form>

          <p
            style={{
              textAlign: 'center',
              marginTop: 24,
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            Don't have an account?{' '}
            <Link to="/signup" style={{ fontWeight: 600 }}>
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
