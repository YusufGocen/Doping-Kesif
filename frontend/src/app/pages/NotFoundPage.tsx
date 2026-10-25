import { Link } from 'react-router-dom';
export function NotFoundPage() {
  return (
    <section className="route-state">
      <span className="eyebrow">404</span>
      <h1>Bu rotada bir sayfa yok.</h1>
      <p>Keşif yolculuğuna ana sayfadan devam edebilirsin.</p>
      <Link className="primary" to="/kesif">
        Keşif’e dön
      </Link>
    </section>
  );
}
