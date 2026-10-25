import DashboardLayout from '../DashboardLayout';
// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/app/App';
import { createMemoryRouter } from 'react-router-dom';
import { routes } from '@/app/router';
const routers: ReturnType<typeof createMemoryRouter>[] = [];
async function renderApp(path = '/kesif') {
  const router = createMemoryRouter(
    routes
      .filter((route) => route.children)
      .map((route) => ({ ...route, element: <DashboardLayout /> })),
    { initialEntries: [path] },
  );
  routers.push(router);
  const view = render(<App router={router} />);
  await screen.findByRole('heading', { name: 'Doping Keşif', level: 1 });
  return view;
}

beforeAll(() => {
  // jsdom does not implement native dialog top-layer behavior. Browser QA remains separate.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true })),
  );
});
afterEach(() => {
  cleanup();
  routers.splice(0).forEach((router) => router.dispose());
  vi.unstubAllGlobals();
});

describe('Doping Keşif dashboard shell', () => {
  it('keeps the platform shell and uses the new product name', async () => {
    await renderApp();
    expect(screen.getByRole('heading', { name: 'Doping Keşif', level: 1 })).toBeTruthy();
    const navigation = screen.getByRole('navigation', { name: 'Doping Hafıza bölümleri' });
    const discovery = within(navigation).getByRole('link', { name: /Doping Keşif/ });
    expect(discovery.getAttribute('aria-current')).toBe('page');
    expect(discovery.getAttribute('href')).toBe('/kesif');
    expect(screen.getByRole('complementary', { name: 'Takvim ve yolculuk' })).toBeTruthy();
  });

  it('collapses and restores the individual applications submenu', async () => {
    const user = userEvent.setup();
    await renderApp();
    const toggle = screen.getByRole('button', { name: 'Bire Bir Uygulamalar' });
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Çözücü' })).toBeNull();
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Çözücü' })).toBeTruthy();
  });

  it('moves calendar selection by one week and returns to today', async () => {
    const user = userEvent.setup();
    await renderApp();
    const original = screen.getByRole('button', { pressed: true }).getAttribute('aria-label');
    await user.click(screen.getByRole('button', { name: 'Sonraki hafta' }));
    expect(screen.getByRole('button', { pressed: true }).getAttribute('aria-label')).not.toBe(
      original,
    );
    await user.click(screen.getByRole('button', { name: 'Önceki hafta' }));
    expect(screen.getByRole('button', { pressed: true }).getAttribute('aria-label')).toBe(original);
    await user.click(screen.getByRole('button', { name: 'Sonraki hafta' }));
    await user.click(screen.getByRole('button', { name: 'Bugün' }));
    expect(screen.getByRole('button', { pressed: true }).getAttribute('aria-label')).toBe(original);
  });

  it('opens the help dialog and closes it without changing page context', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Nasıl keşfederim?' }));
    const dialog = screen.getByRole('dialog', { name: 'Birlikte nasıl keşfederiz?' });
    expect(within(dialog).getByText('10 soruyu birlikte tamamla; 20 parçayı keşfet!')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Kapat' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Doping Keşif', level: 1 })).toBeTruthy();
  });

  it('applies the compact menu preference', async () => {
    const user = userEvent.setup();
    const { container } = await renderApp();
    await user.click(screen.getByRole('button', { name: 'Görünüm ayarları' }));
    await user.click(screen.getByRole('checkbox', { name: 'Sıkışık menü görünümü' }));
    expect(container.querySelector('.app')?.classList.contains('compact')).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Anladım' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens mobile drawers and closes them with Escape', async () => {
    const user = userEvent.setup();
    const { container } = await renderApp();
    await user.click(screen.getByRole('button', { name: 'Menüyü aç' }));
    expect(container.querySelector('.sidebar')?.classList.contains('is-open')).toBe(true);
    await user.keyboard('{Escape}');
    expect(container.querySelector('.sidebar')?.classList.contains('is-open')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Takvimi göster' }));
    expect(container.querySelector('.right-panel')?.classList.contains('is-open')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Takvimi kapat' })).toBeNull();
    await user.keyboard('{Escape}');
    expect(container.querySelector('.right-panel')?.classList.contains('is-open')).toBe(false);
  });

  it('does not pretend that external platform sections are integrated', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Dersler' }));
    expect(screen.getByRole('status').textContent).toContain('Doping Hafıza platformuna aittir');
    expect(screen.getByRole('heading', { name: 'Doping Keşif', level: 1 })).toBeTruthy();
  });
});
