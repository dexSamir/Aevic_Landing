/** A single team's labelled result. Multiple matches need manual review. */
export function screenshotResult(text: string) {
  function singleInteger(pattern: RegExp, min: number, max: number) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length !== 1) return '';
    const value = Number(matches[0][1]);
    return value >= min && value <= max ? String(value) : '';
  }

  const placement = singleInteger(/(?:\b(?:team\s+rank(?:ing)?|placement|rank(?:ing)?)\s*[:#]?\s*|^\s*#)(\d{1,3})(?![\d.])(?:\s*\/\s*\d+)?/gim, 1, 100);
  // Individual player kills and point totals can also appear on team screenshots.
  const kills = singleInteger(/\b(?:team|total)\s+(?:eliminations|kills|finishes)\s*[:#]?\s*(\d{1,3})(?![\d.])/gi, 0, 400);
  return { placement, kills };
}
