import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ChartSnapshot } from '../src/components/team/ChartSnapshot';
import { toPng } from 'html-to-image';
vi.mock('html-to-image', () => ({ toPng: vi.fn().mockResolvedValue('data:image/png;base64,test') }));
beforeEach(() => {
 Object.defineProperty(document, 'fonts', { configurable:true, value:{ready:Promise.resolve()} });
 vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
it('exports the complete labelled composition at 2x after fonts are ready, excluding controls', async () => {
 let ready!:()=>void;
 document.fonts.ready = new Promise(resolve => {ready=()=>resolve(document.fonts);});
 render(<ChartSnapshot title="Günlər üzrə ümumi kill" subtitle="Oktyabr · gündəlik cəm" filename="kills"><svg aria-label="Kill / gün" /></ChartSnapshot>);
 fireEvent.click(screen.getByRole('button', {name:/PNG yüklə/}));
 expect(toPng).not.toHaveBeenCalled();
 expect(screen.getByRole('button')).toBeDisabled();
 ready();
 await waitFor(() => expect(toPng).toHaveBeenCalled());
 const [node,options]=vi.mocked(toPng).mock.calls[0];
 expect(node.textContent).toContain('Günlər üzrə ümumi kill');
 expect(node.textContent).toContain('Oktyabr · gündəlik cəm');
 expect(node.textContent).toContain('AEVIC');
 expect(options?.pixelRatio).toBe(2);
 expect(options?.filter?.(screen.getByRole('button'))).toBe(false);
 expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
});
it('reports renderer failure and allows another export', async () => {
 vi.mocked(toPng).mockRejectedValueOnce(new Error('render failed'));
 render(<ChartSnapshot title="Yerləşmə" subtitle="1 ən yaxşıdır" filename="placement"><svg /></ChartSnapshot>);
 fireEvent.click(screen.getByRole('button'));
 expect(await screen.findByRole('alert')).toHaveTextContent('Yenidən cəhd edin');
 fireEvent.click(screen.getByRole('button'));
 await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});
