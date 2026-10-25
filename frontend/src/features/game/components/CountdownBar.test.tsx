// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CountdownBar } from './CountdownBar';
afterEach(cleanup);
it('shrinks with remaining time, stays stable on snapshot refresh and clamps at zero', () => {
  const start = Date.parse('2026-10-23T12:00:00Z'),
    deadline = new Date(start + 30000).toISOString();
  const view = render(<CountdownBar deadline={deadline} now={start} />);
  const bar = screen.getByRole('progressbar', { name: 'Kalan süre çubuğu' }) as HTMLProgressElement;
  expect(bar.value).toBe(30000);
  expect(bar.max).toBe(30000);
  view.rerender(<CountdownBar deadline={deadline} now={start + 11000} />);
  expect(bar.value).toBe(19000);
  expect(bar.max).toBe(30000);
  view.rerender(<CountdownBar deadline={deadline} now={start + 20000} />);
  expect(bar.value).toBe(10000);
  view.rerender(<CountdownBar deadline={deadline} now={start + 31000} />);
  expect(bar.value).toBe(0);
});
it('resets for a new round and uses remaining server time when joining late', () => {
  const now = Date.parse('2026-10-23T12:00:00Z');
  const view = render(
    <CountdownBar key="round1" deadline={new Date(now + 12000).toISOString()} now={now} />,
  );
  expect((screen.getByRole('progressbar') as HTMLProgressElement).max).toBe(12000);
  view.rerender(
    <CountdownBar key="round2" deadline={new Date(now + 40000).toISOString()} now={now + 10000} />,
  );
  expect((screen.getByRole('progressbar') as HTMLProgressElement).value).toBe(30000);
  expect((screen.getByRole('progressbar') as HTMLProgressElement).max).toBe(30000);
});
