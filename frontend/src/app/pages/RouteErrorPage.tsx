import { Link, useRevalidator } from 'react-router-dom';
export function RouteErrorPage() {
  const revalidator = useRevalidator();
  return (
    <main className="route-state" role="alert">
      <h1>Sayfa yüklenemedi.</h1>
      <p>Lütfen tekrar dene veya Keşif ana sayfasına dön.</p>
      <button
        className="primary"
        onClick={() => revalidator.revalidate()}
        disabled={revalidator.state === 'loading'}
      >
        Tekrar dene
      </button>
      <Link className="text-button" to="/kesif">
        Keşif’e dön
      </Link>
    </main>
  );
}
