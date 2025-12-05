import { NextResponse } from "next/server";

const token = process.env.GITHUB_TOKEN;

const getGitHubHeaders = () => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    console.log("Fetching languages for user:", username);

    const repoRes = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100`,
      { headers: getGitHubHeaders() }
    );

    const repos = await repoRes.json();

    if (!Array.isArray(repos)) {
      console.error("Unexpected GitHub API response:", repos);
      return NextResponse.json(
        { error: "Failed to fetch repositories", details: repos },
        { status: 500 }
      );
    }

    const nonForked = repos.filter((repo) => !repo.fork);

    const topRepos = nonForked
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10);

    const globalLanguageBytes: Record<string, number> = {};

    for (const repo of topRepos) {
      const langRes = await fetch(repo.languages_url, {
        headers: getGitHubHeaders(),
      });
      const languages = await langRes.json();

      for (const [lang, bytes] of Object.entries(languages)) {
        globalLanguageBytes[lang] =
          (globalLanguageBytes[lang] || 0) + (bytes as number);
      }
    }

    const totalBytes = Object.values(globalLanguageBytes).reduce(
      (a, b) => a + b,
      0
    );

    if (totalBytes === 0) {
      return NextResponse.json({ languages: [] });
    }

    const languagePercentages = Object.entries(globalLanguageBytes)
      .map(([lang, bytes]) => ({
        lang,
        percentage: ((bytes / totalBytes) * 100).toFixed(2),
      }))
      .sort((a, b) => Number(b.percentage) - Number(a.percentage));

    console.log("User's top languages (top 10 repos):", languagePercentages);

    return NextResponse.json({ languages: languagePercentages });
  } catch (error) {
    console.error("Error fetching user languages:", error);
    return NextResponse.json(
      { error: "Failed to fetch user languages" },
      { status: 500 }
    );
  }
}