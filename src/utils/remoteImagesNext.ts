type RemotePattern = {
  protocol: 'http' | 'https';
  hostname: string;
};

export function buildNextImageRemotePatterns(origins?: string): {
  remotePatterns: RemotePattern[];
} {
  if (!origins) {
    return { remotePatterns: [] };
  }

  const remotePatterns: RemotePattern[] = origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        const url = new URL(origin);

        return {
          protocol: url.protocol.replace(':', '') as 'http' | 'https',
          hostname: url.hostname,
        };
      } catch {
        // Ignore invalid URLs silently
        return null;
      }
    })
    .filter((v): v is RemotePattern => v !== null);

  return { remotePatterns };
}
