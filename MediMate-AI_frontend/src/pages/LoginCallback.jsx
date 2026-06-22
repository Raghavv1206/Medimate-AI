import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const access = params.get('access');
    const refresh = params.get('refresh');
    const userId = params.get('user_id');
    const role = params.get('role');
    const name = params.get('name');
    const avatar = params.get('avatar');

    if (access && refresh) {
      // Save tokens and user info to localStorage
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      const userData = {
        id: userId,
        role: role,
        name: name,
        full_name: name,
        avatar_url: avatar,
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      // Redirect based on user role
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'caretaker') {
        navigate('/caretaker');
      } else {
        navigate('/dashboard');
      }
    } else {
      // Fallback if no tokens found or if error was passed
      const errorParam = params.get('error');
      if (errorParam) {
        navigate(`/?error=${encodeURIComponent(errorParam)}`);
      } else {
        navigate('/');
      }
    }
  }, [location, navigate, setUser]);

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: 40, 
          height: 40, 
          border: '2px solid var(--border)', 
          borderTopColor: 'var(--cyan)', 
          borderRadius: '50%', 
          animation: 'spin 0.8s linear infinite', 
          margin: '0 auto 16px' 
        }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Authenticating with Google...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
