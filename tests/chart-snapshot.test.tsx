import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ChartSnapshot } from '../src/components/team/ChartSnapshot';
import { toCanvas } from 'html-to-image';
vi.mock('html-to-image', () => ({ toCanvas: vi.fn().mockImplementation(async () => document.createElement('canvas')) }));
beforeEach(() => {
 vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage:vi.fn(), getImageData:()=>({data:new Uint8ClampedArray([0,0,0,255,255,255,255,255])}) } as unknown as CanvasRenderingContext2D);
 vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,' + 'a'.repeat(100));
 vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
 vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
 vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(600);
 Object.defineProperty(document, 'fonts', { configurable:true, value:{ready:Promise.resolve()} });
 vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
it('exports the complete labelled composition at 2x after fonts are ready, excluding controls', async () => {
 let ready!:()=>void;
 document.fonts.ready = new Promise(resolve => {ready=()=>resolve(document.fonts);});
 render(<ChartSnapshot title="Günlər üzrə ümumi kill" subtitle="Oktyabr · gündəlik cəm" filename="kills"><svg aria-label="Kill / gün" /></ChartSnapshot>);
 fireEvent.click(screen.getByRole('button', {name:/PNG yüklə/}));
 expect(toCanvas).not.toHaveBeenCalled();
 expect(screen.getByRole('button')).toBeDisabled();
 ready();
 await waitFor(() => expect(toCanvas).toHaveBeenCalled());
 const [node,options]=vi.mocked(toCanvas).mock.calls[0];
 expect(node.textContent).toContain('Günlər üzrə ümumi kill');
 expect(node.textContent).toContain('Oktyabr · gündəlik cəm');
 expect(node.textContent).toContain('AEVIC');
 expect(options?.pixelRatio).toBe(2);
 expect(options?.filter?.(screen.getByRole('button'))).toBe(false);
 expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
});
it('reports renderer failure and allows another export', async () => {
 vi.mocked(toCanvas).mockRejectedValueOnce(new Error('render failed'));
 render(<ChartSnapshot title="Yerləşmə" subtitle="1 ən yaxşıdır" filename="placement"><svg /></ChartSnapshot>);
 fireEvent.click(screen.getByRole('button'));
 expect(await screen.findByRole('alert')).toHaveTextContent('Yenidən cəhd edin');
 fireEvent.click(screen.getByRole('button'));
 await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});
