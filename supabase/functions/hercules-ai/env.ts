export const getEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const getOptionalEnv = (key: string, fallback = ''): string => {
  return Deno.env.get(key) ?? fallback;
};

export const getOptionalNumber = (key: string, fallback: number): number => {
  const value = Deno.env.get(key);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
