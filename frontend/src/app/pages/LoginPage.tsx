import { Navigate, useSearchParams } from 'react-router-dom';
import { Brand } from '@/shared/brand/Brand';
import { useSession } from '@/shared/session/SessionProvider';
import { env } from '@/shared/config/env';
import { LocalAccountPanel } from '@/features/auth/components/LocalAccountPanel';
import '@/features/auth/styles/login.css';
export default function LoginPage() {
  const { session } = useSession();
  const [params] = useSearchParams();
  const requested = params.get('next');
  const next = requested && /^\/kesif(?:\/|\?|$)/.test(requested) ? requested : '/kesif';
  if (session) return <Navigate to={next} replace />;
  return (
    <main className="login-screen">
      <section className="login-story" aria-label="Doping Hafıza tanıtımı">
        <img
          className="login-platform-image"
          src="/images/discovery/login-platform.png"
          alt="Doping Hafıza dijital öğrenme platformunun tablet üzerindeki görünümü"
          width="974"
          height="905"
        />
      </section>
      <section className="login-welcome" aria-labelledby="login-title">
        <div className="login-mark">
          <Brand />
        </div>
        <h1 id="login-title">Merhaba</h1>
        <p className="login-subtitle">Doping Hafıza’ya Hoş Geldiniz!</p>
        <p className="login-instruction">Devam etmek için kullanıcını seç.</p>
        {env.localAuthEnabled ? (
          <LocalAccountPanel />
        ) : (
          <p role="status">Hesabınla giriş bağlantısı henüz yapılandırılmadı.</p>
        )}
        <footer>Doping Hafıza bir Doping Technology markasıdır.</footer>
      </section>
    </main>
  );
}
