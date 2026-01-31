import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Auth.css';

function Auth({ user }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLogin && user?.email) {
      setEmail(user.email);
    } else if (!isLogin) {
      // 회원가입 모드일 때는 이메일 필드를 비워둡니다.
      setEmail('');
    }
  }, [isLogin, user]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (isLogin) {
        // 로그인
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        setMessage('로그인 성공!');
      } else {
        // 회원가입
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage('회원가입 성공! 이메일을 확인하여 계정을 활성화해주세요.');
      }
    } catch (err) {
      setError('인증 오류: ' + err.message);
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      // 재전송 시 폼에 입력된 이메일 또는 user prop의 이메일 사용
      const emailToResend = email || user?.email;
      if (!emailToResend) {
        setError('인증 메일을 재전송할 이메일 주소를 알 수 없습니다.');
        return;
      }
      const { error: resendError } = await supabase.auth.resend({ email: emailToResend, type: 'signup' });
      if (resendError) throw resendError;
      setMessage('인증 메일이 재전송되었습니다. 이메일을 확인해주세요.');
    } catch (err) {
      setError('인증 메일 재전송 오류: ' + err.message);
      console.error('Resend email error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 재전송 버튼 표시 조건
  const showResendButton = (
    (!isLogin && message && message.includes('회원가입 성공')) || // 회원가입 직후
    (isLogin && user && !user.email_confirmed_at) // 로그인 상태인데 이메일 미인증
  );

  // 로그인 상태인데 이메일이 미인증된 경우
  if (isLogin && user && !user.email_confirmed_at) {
    return (
      <div className="auth-container">
        <h2>이메일 인증 필요</h2>
        <p className="auth-message info">회원가입을 완료했지만 아직 이메일 인증을 하지 않았습니다. 이메일 ({user.email})을 확인하여 계정을 활성화해주세요.</p>
        {message && <p className="auth-message success">{message}</p>}
        {error && <p className="auth-message error">{error}</p>}
        {showResendButton && (
          <button onClick={handleResendEmail} disabled={loading} className="resend-email-button">
            {loading ? '재전송 중...' : '인증 메일 재전송'}
          </button>
        )}
        <button onClick={() => setIsLogin(!isLogin)} className="toggle-auth-mode">
          다른 계정으로 로그인 또는 회원가입
        </button>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h2>{isLogin ? '로그인' : '회원가입'}</h2>
      <form onSubmit={handleAuth} className="auth-form">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}
        </button>
      </form>
      {message && <p className="auth-message success">{message}</p>}
      {error && <p className="auth-message error">{error}</p>}
      {showResendButton && (
        <button onClick={handleResendEmail} disabled={loading} className="resend-email-button">
          {loading ? '재전송 중...' : '인증 메일 재전송'}
        </button>
      )}
      <button onClick={() => setIsLogin(!isLogin)} className="toggle-auth-mode">
        {isLogin ? '회원가입 페이지로 이동' : '로그인 페이지로 이동'}
      </button>
    </div>
  );
}

export default Auth;
