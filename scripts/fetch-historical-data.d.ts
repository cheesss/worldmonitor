export function fetchHistoricalEnvelope(
  provider: string,
  args?: Record<string, string | number | boolean | string[] | undefined>,
): Promise<unknown>;

export function writeHistoricalEnvelope(
  outputPath: string,
  provider: string,
  envelope: unknown,
): Promise<string>;
