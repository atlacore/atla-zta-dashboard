import useSWR from "swr";

export const GITHUB_REPO = "atlacore/atla-zta";
export const REPOSITORY_URL = `https://github.com/${GITHUB_REPO}`;
export const RELEASES_URL = `${REPOSITORY_URL}/releases/latest`;

type GithubRelease = {
  tag_name: string;
  html_url: string;
  assets: { name: string; browser_download_url: string }[];
};

export type ClientArch = "amd64" | "arm64";

const fetchRelease = async (url: string): Promise<GithubRelease> => {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub responded ${response.status}`);
  return response.json();
};

// Latest published atla-client build for Linux, resolved from the GitHub release. When the API is
// unreachable (rate limit, private repository) `asset` is undefined and the releases page link remains.
export function useLatestClientRelease() {
  const { data } = useSWR<GithubRelease>(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
    fetchRelease,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      dedupingInterval: 60 * 60 * 1000,
    },
  );

  return {
    version: data?.tag_name,
    releaseUrl: data?.html_url ?? RELEASES_URL,
    asset: (arch: ClientArch) => {
      const found = data?.assets.find(
        (a) =>
          a.name.startsWith("atla-client_") &&
          a.name.endsWith(`_linux_${arch}.tar.gz`),
      );
      return found && { name: found.name, url: found.browser_download_url };
    },
  };
}
