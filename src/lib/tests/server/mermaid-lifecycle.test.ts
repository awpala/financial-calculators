import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  close: vi.fn(),
  launch: vi.fn(),
  render: vi.fn(),
}));

vi.mock('puppeteer', () => ({ default: { launch: mocks.launch } }));
vi.mock('@mermaid-js/mermaid-cli', () => ({ renderMermaid: mocks.render }));
vi.mock('$app/env/private', () => ({
  PUPPETEER_EXECUTABLE_PATH: '/test/chromium',
}));

import { renderMermaidSvg } from '#lib/server/mermaid-cli.js';

beforeEach(() => {
  mocks.close.mockReset().mockResolvedValue(undefined);
  mocks.launch.mockReset().mockResolvedValue({ close: mocks.close });
  mocks.render.mockReset().mockResolvedValue({ data: Buffer.from('<svg/>') });
});

describe('Mermaid browser ownership', () => {
  it('shares identical renders and closes the owned browser before resolving', async () => {
    const definition = 'flowchart LR; A-->B';
    expect(
      await Promise.all([
        renderMermaidSvg(definition),
        renderMermaidSvg(definition),
      ]),
    ).toEqual(['<svg/>', '<svg/>']);
    expect(mocks.launch).toHaveBeenCalledTimes(1);
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it('closes the browser on a deterministic failure and evicts the failed cache entry', async () => {
    mocks.render.mockRejectedValueOnce(new Error('Invalid diagram'));
    await expect(renderMermaidSvg('invalid source')).rejects.toThrow(
      'Invalid diagram',
    );
    expect(mocks.close).toHaveBeenCalledTimes(1);
    await expect(renderMermaidSvg('invalid source')).resolves.toBe('<svg/>');
    expect(mocks.launch).toHaveBeenCalledTimes(2);
    expect(mocks.close).toHaveBeenCalledTimes(2);
  });

  it('closes a timed-out render and releases its deadline timer', async () => {
    vi.useFakeTimers();
    try {
      mocks.render.mockReturnValueOnce(new Promise(() => {}));
      const result = expect(renderMermaidSvg('slow diagram')).rejects.toThrow(
        'timed out',
      );
      await vi.advanceTimersByTimeAsync(8_001);
      await result;
      expect(mocks.close).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
