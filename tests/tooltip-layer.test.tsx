import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipLayer } from '../src/components/common/TooltipLayer';
import { Button, Tooltip } from '../src/components/common/primitives';
afterEach(() => vi.useRealTimers());
function setup() { vi.useFakeTimers(); render(<><TooltipLayer /><Tooltip label="Əlavə məlumat"><button aria-describedby="existing">Məlumat</button></Tooltip><Button title="Yüklə">Export</Button></>); return screen.getByRole('button', { name: 'Məlumat' }); }
describe('shared tooltip interactions', () => {
  it('delays focus hints, preserves descriptions, and dismisses with Escape', () => {
    const button = setup();
    act(() => button.focus());
    act(() => vi.advanceTimersByTime(499));
    expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Əlavə məlumat');
    expect(button.getAttribute('aria-describedby')).toContain(screen.getByRole('tooltip').id);
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(button).toHaveAttribute('aria-describedby', 'existing');
    expect(screen.getByRole('button', { name: 'Export' })).not.toHaveAttribute('title');
  });
  it('cancels pending hints when the pointer leaves', () => {
    const button = setup();
    fireEvent.pointerOver(button, { pointerType: 'mouse' });
    fireEvent.pointerOut(button);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
  it('does not open from touch hover', () => {
    const button = setup();
    const event = new Event('pointerover', { bubbles: true });
    Object.defineProperty(event, 'pointerType', { value: 'touch' });
    fireEvent(button, event);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
