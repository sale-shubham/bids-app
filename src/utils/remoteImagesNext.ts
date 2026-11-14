type RemotePattern = {
  protocol: 'http' | 'https';
  hostname: string;
  port?: string;
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
          ...(url.port ? { port: url.port } : {}),
        };
      } catch {
        // Ignore invalid URLs silently
        return null;
      }
    })
    .filter((v): v is RemotePattern => v !== null);

  return { remotePatterns };
}
