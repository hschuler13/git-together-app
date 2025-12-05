"use client";
import { createClient } from "../utils/supabase/client";
import { useEffect, useState } from "react";

interface GitHubIssue {
  issueUrl: string;
  primaryLanguage: string;
  allLanguages: string[];
  repositoryOwner: string;
  repositoryName: string;
  repositoryTopics: string[];
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  issueLabels: string[];
  numberOfAssignees: number;
  hasGFILabel: boolean;
  dateCreated: string;
  daysOpen: number;
  score: number;
}

interface Repository {
  repositoryOwner: string;
  repositoryName: string;
  repositoryTopics: string[];
  primaryLanguage: string;
  issueCount: number;
  averageScore: number;
}

export default function Home() {
  const supabase = createClient();

  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [userLanguages, setUserLanguages] = useState<any[]>([]);

  // Filter issues created within the last X months (adjust as needed)
  const MAX_AGE_MONTHS = 12;
    
  useEffect(() => {
    // Handle session changes
    const handleSessionChange = (session: any) => {
      setSession(session);
      if (session?.user) {
        const username = session.user.user_metadata?.user_name;
        if (username) fetchUserLanguages(username);
        fetchUserPreferences(session.user.id);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionChange(session);
      setLoading(false);
    });

    // Watch for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handleSessionChange(session);
    });

    // Fetch issues
    async function fetchIssues() {
      try {
        const response = await fetch("/api/github-issues");
        const data = await response.json();

        if (data.success) {
          const recentIssues = filterRecentIssues(data.issues);
          setIssues(recentIssues);
        } else {
          setError(data.error || "Failed to fetch issues");
        }
      } catch (err) {
        setError("An error occurred while fetching issues");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchIssues();

    return () => subscription.unsubscribe();
  }, []);

  // Sort issues when all required data is available
  useEffect(() => {
    if (issues.length > 0 && userLanguages.length > 0 && preferences) {
      sortLanguages();
    }
  }, [issues, userLanguages, preferences]);

  const filterRecentIssues = (issues: GitHubIssue[]): GitHubIssue[] => {
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - MAX_AGE_MONTHS);

    return issues.filter((issue) => {
      const issueDate = new Date(issue.dateCreated);
      return issueDate >= monthsAgo;
    });
  };

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      setSession(null);
      window.location.href = "/login";
    }
  }

  // Fetch user preferences from the profiles table
  async function fetchUserPreferences(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", userId)
        .single();

      if (error) throw error;

      console.log("Fetched preferences:", data?.preferences);
      setPreferences(data?.preferences || null);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
    }
  }

  // Fetch top languages based on user's top 10 non-forked repos
  async function fetchUserLanguages(username: string) {
    try {
      console.log("Fetching languages for:", username);

      const repoRes = await fetch(
        `https://api.github.com/users/${username}/repos?per_page=100`
      );
      const repos = await repoRes.json();

      if (!Array.isArray(repos)) {
        console.error("Unexpected GitHub API response:", repos);
        return;
      }

      const nonForked = repos.filter((repo) => !repo.fork);

      // sort by stars, take top 10
      const topRepos = nonForked
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 10);

      const globalLanguageBytes: Record<string, number> = {};

      for (const repo of topRepos) {
        const langRes = await fetch(repo.languages_url);
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
      const languagePercentages = Object.entries(globalLanguageBytes)
        .map(([lang, bytes]) => ({
          lang,
          percentage: ((bytes / totalBytes) * 100).toFixed(2),
        }))
        .sort((a, b) => Number(b.percentage) - Number(a.percentage));

      console.log("User's top languages (top 10 repos):", languagePercentages);
      setUserLanguages(languagePercentages);
    } catch (error) {
      console.error("Error fetching user languages:", error);
    }
  }

  function sortLanguages() {
    // Weights for different scoring factors (should sum to 1.0)
    const RECENCY_WEIGHT = 0.20;
    const LANGUAGE_WEIGHT = 0.35;
    const TOPIC_WEIGHT = 0.45;

    // Maximum days we consider for recency scoring
    const MAX_DAYS_FOR_SCORING = 180;

    const scoredIssues = issues.map((issue) => {
      let score = 0;

      // 1. RECENCY SCORE (0-20 points)
      // Newer issues get higher scores, capped at MAX_DAYS_FOR_SCORING
      const daysForScore = Math.min(issue.daysOpen, MAX_DAYS_FOR_SCORING);
      const recencyScore = (1 - daysForScore / MAX_DAYS_FOR_SCORING) * 100;
      score += recencyScore * RECENCY_WEIGHT;

      // 2. LANGUAGE MATCH SCORE (0-35 points)
      const languageMatch = userLanguages.find(
        (l) => l.lang.toLowerCase() === issue.primaryLanguage.toLowerCase()
      );
      
      if (languageMatch && userLanguages.length > 0) {
        const langIndex = userLanguages.findIndex(
          (l) => l.lang.toLowerCase() === issue.primaryLanguage.toLowerCase()
        );
        // Top language gets 100, decreasing linearly
        const languageScore = ((userLanguages.length - langIndex) / userLanguages.length) * 100;
        score += languageScore * LANGUAGE_WEIGHT;
      }

      // 3. TOPIC MATCH SCORE (0-45 points)
      if (preferences && preferences.length > 0) {
        const topicMatches = issue.repositoryTopics.filter((topic) =>
          preferences.some((pref: string) => 
            pref.toLowerCase() === topic.toLowerCase()
          )
        );
        
        if (topicMatches.length > 0) {
          // Score based on percentage of user preferences matched
          const topicScore = Math.min((topicMatches.length / preferences.length) * 100, 100);
          score += topicScore * TOPIC_WEIGHT;
        }
      }

      return { ...issue, score: Math.round(score * 100) / 100 };
    });

    // Sort by score descending and update state
    const sortedIssues = scoredIssues.sort((a, b) => b.score - a.score);
    setIssues(sortedIssues);
    
    console.log("Top 5 scored issues:", sortedIssues.slice(0, 5).map(i => ({
      title: i.issueTitle,
      score: i.score,
      language: i.primaryLanguage,
      topics: i.repositoryTopics,
      days: i.daysOpen
    })));

    // Extract and aggregate repository information
    const repoMap = new Map<string, Repository>();
    
    sortedIssues.forEach((issue) => {
      const repoKey = `${issue.repositoryOwner}/${issue.repositoryName}`;
      
      if (repoMap.has(repoKey)) {
        const existing = repoMap.get(repoKey)!;
        existing.issueCount += 1;
        existing.averageScore = (existing.averageScore * (existing.issueCount - 1) + issue.score) / existing.issueCount;
      } else {
        repoMap.set(repoKey, {
          repositoryOwner: issue.repositoryOwner,
          repositoryName: issue.repositoryName,
          repositoryTopics: issue.repositoryTopics,
          primaryLanguage: issue.primaryLanguage,
          issueCount: 1,
          averageScore: issue.score,
        });
      }
    });

    // Convert map to array and sort by average score
    const repoArray = Array.from(repoMap.values()).sort(
      (a, b) => b.averageScore - a.averageScore
    );
    
    setRepositories(repoArray);
    
    console.log("Top 5 repositories:", repoArray.slice(0, 5).map(r => ({
      name: `${r.repositoryOwner}/${r.repositoryName}`,
      issueCount: r.issueCount,
      averageScore: r.averageScore,
    })));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Home Page</h1>
        {session ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-lg">Welcome, {session.user.email}!</p>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>

            {/* Repository Recommendations Section */}
            {repositories.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Recommended Repositories</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {repositories.slice(0, 6).map((repo) => (
                    <div
                      key={`${repo.repositoryOwner}/${repo.repositoryName}`}
                      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                    >
                      <a
                        href={`https://github.com/${repo.repositoryOwner}/${repo.repositoryName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg text-blue-600 hover:underline font-semibold block mb-2"
                      >
                        {repo.repositoryOwner}/{repo.repositoryName}
                      </a>
                      
                      <div className="mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {repo.primaryLanguage}
                        </span>
                        <span className="ml-2 text-sm text-gray-600">
                          {repo.issueCount} {repo.issueCount === 1 ? 'issue' : 'issues'}
                        </span>
                      </div>

                      {repo.repositoryTopics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {repo.repositoryTopics.slice(0, 4).map((topic) => (
                            <span
                              key={topic}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              {topic}
                            </span>
                          ))}
                          {repo.repositoryTopics.length > 4 && (
                            <span className="text-xs text-gray-500">
                              +{repo.repositoryTopics.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="text-sm text-gray-500">
                        Match Score: {repo.averageScore.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Recommended Issues</h2>
              <div className="space-y-6">
                {issues.map((issue) => (
                  <article
                    key={`${issue.repositoryOwner}-${issue.repositoryName}-${issue.issueNumber}`}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    {/* Repository Info */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <a
                          href={`https://github.com/${issue.repositoryOwner}/${issue.repositoryName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline font-medium"
                        >
                          {issue.repositoryOwner}/{issue.repositoryName}
                        </a>
                        <h2 className="text-xl font-semibold text-gray-900 mt-1">
                          <a
                            href={issue.issueUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 transition-colors"
                          >
                            {issue.issueTitle}
                          </a>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          #{issue.issueNumber} opened {issue.daysOpen} days ago • Match Score: {issue.score}
                        </p>
                      </div>
                    </div>

                    {/* Issue Body Preview */}
                    {issue.issueBody && (
                      <p className="text-gray-700 mb-4 line-clamp-3">
                        {issue.issueBody.substring(0, 200)}
                        {issue.issueBody.length > 200 ? "..." : ""}
                      </p>
                    )}

                    {/* Languages */}
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700 mr-2">
                        Primary Language:
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {issue.primaryLanguage}
                      </span>

                      {issue.allLanguages.length > 1 && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-600">
                            Also uses:{" "}
                            {issue.allLanguages
                              .filter((lang) => lang !== issue.primaryLanguage)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Topics */}
                    {issue.repositoryTopics?.length > 0 && (
                      <div className="mb-4">
                        <span className="text-sm font-medium text-gray-700 mr-2">
                          Topics:
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {issue.repositoryTopics.map((topic) => (
                            <span
                              key={topic}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Labels */}
                    <div className="flex flex-wrap gap-2">
                      {issue.issueLabels.map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    {/* Action Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <a
                        href={issue.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        View Issue on GitHub
                        <svg
                          className="ml-2 -mr-1 w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p>You are not logged in</p>
          </div>
        )}
      </div>
    </div>
  );
}