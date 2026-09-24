import { appendFileSync } from 'node:fs';
import { test, expect } from '../helpers/api-fixture-test';

test('key journeys remain usable with a slower network and CPU', async ({ page, context }, info) => {
  const session = await context.newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750,
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  for (const path of ['/', '/teams', '/login', '/team']) {
    const started = Date.now();
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('h1,h2').first()).toBeVisible();
    appendFileSync('/tmp/aevic-performance-slow-network.jsonl', JSON.stringify({
      device: info.project.name, path, settledMs: Date.now() - started,
      latencyMs: 150, downloadBytesPerSecond: 200_000, cpuSlowdown: 4,
    }) + '\n');
  }
});
