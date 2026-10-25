// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router-dom';
import App from './App';
import { routes } from './router';

const routers: ReturnType<typeof createMemoryRouter>[] = [];
afterEach(() => {
  cleanup();
  routers.splice(0).forEach((router) => router.dispose());
});

it('redirects anonymous discovery to the standalone login screen', async () => {
  const router = createMemoryRouter(routes, {
    initialEntries: ['/kesif/ayarlar?gorev=DEMO_HISTORY'],
  });
  routers.push(router);
  render(<App router={router} />);
  await screen.findByRole('heading', { name: 'Merhaba' });
  expect(router.state.location.pathname).toBe('/giris');
  expect(new URLSearchParams(router.state.location.search).get('next')).toBe(
    '/kesif/ayarlar?gorev=DEMO_HISTORY',
  );
  expect(screen.queryByRole('navigation', { name: 'Doping Hafıza bölümleri' })).toBeNull();
});
it('renders the welcome screen directly without a dashboard shell', async () => {
  const router = createMemoryRouter(routes, { initialEntries: ['/giris'] });
  routers.push(router);
  render(<App router={router} />);
  await screen.findByRole('heading', { name: 'Merhaba' });
  expect(screen.getByText('Doping Hafıza’ya Hoş Geldiniz!')).toBeTruthy();
  expect(screen.queryByText('Yerel test hesabı')).toBeNull();
});
