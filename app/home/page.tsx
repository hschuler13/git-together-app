"use client";
import { LogOut, Settings } from "lucide-react";
import { createClient } from "../utils/supabase/client";
import { useEffect, useState, useMemo } from "react";

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

interface Mentor {
  id: string;
  username: string;
  email: string;
  languages?: { lang: string; percentage: string }[];
  preferences?: string[];
  score?: number;
}

export default function Home() {
  const supabase = createClient();

  const [rawIssues, setRawIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [userLanguages, setUserLanguages] = useState<any[]>([]);
  const [rawMentors, setRawMentors] = useState<Mentor[]>([]);
  const [username, setUsername] = useState<string>("");

  const MAX_AGE_MONTHS = 12;

  useEffect(() => {
    const handleSessionChange = async (session: any) => {
      setSession(session);
      if (session?.user) {
        const fetchedUsername = await getUsernameFromProfile(session.user.id);
        if (fetchedUsername) {
          setUsername(fetchedUsername);
          fetchUserLanguages(fetchedUsername);
        }
        fetchUserPreferences(session.user.id);
        fetchMentors(session.user.id);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionChange(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handleSessionChange(session);
    });

    async function fetchIssues() {
      try {
        const response = await fetch("/api/github-issues");
        const data = await response.json();

        if (data.success) {
          const recentIssues = filterRecentIssues(data.issues);
          setRawIssues(recentIssues);
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

  const filterRecentIssues = (issues: GitHubIssue[]): GitHubIssue[] => {
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - MAX_AGE_MONTHS);

    return issues.filter((issue) => {
      const issueDate = new Date(issue.dateCreated);
      return issueDate >= monthsAgo;
    });
  };

  async function getUsernameFromProfile(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching username from profile:", error);
        return null;
      }

      return data?.username || null;
    } catch (error) {
      console.error("Error fetching username:", error);
      return null;
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      setSession(null);
      window.location.href = "/login";
    }
  }

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

  async function fetchMentors(currentUserId: string) {
    try {
      console.log("Fetching mentors for user:", currentUserId);

      const { data: currentUserData, error: currentUserError } = await supabase
        .from("profiles")
        .select("mentor_status")
        .eq("id", currentUserId)
        .single();

      if (currentUserError) {
        console.error("Error fetching current user:", currentUserError);
        throw currentUserError;
      }

      const isCurrentUserMentor = currentUserData?.mentor_status === true;
      console.log("Is current user a mentor?", isCurrentUserMentor);

      let query = supabase
        .from("profiles")
        .select("id, username, email, preferences")
        .eq("mentor_status", true);

      if (isCurrentUserMentor) {
        query = query.neq("id", currentUserId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      console.log("Fetched mentors:", data);
      console.log("Number of mentors found:", data?.length || 0);

      const mentorsWithLanguages = await Promise.all(
        (data || []).map(async (mentor) => {
          const languages = await fetchMentorLanguages(mentor.username);
          return { ...mentor, languages };
        })
      );

      setRawMentors(mentorsWithLanguages);
    } catch (error) {
      console.error("Error fetching mentors:", error);
    }
  }

  async function fetchMentorLanguages(username: string) {
    try {
      console.log("Fetching languages for mentor:", username);

      const response = await fetch("/api/mentor-languages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Error fetching mentor languages:", data.error);
        return [];
      }

      console.log(`Mentor ${username}'s top languages:`, data.languages);
      return data.languages;
    } catch (error) {
      console.error(`Error fetching languages for mentor ${username}:`, error);
      return [];
    }
  }

  async function fetchUserLanguages(username: string) {
    try {
      console.log("Fetching languages for user:", username);

      const response = await fetch("/api/user-languages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Error fetching user languages:", data.error);
        return;
      }

      console.log("User's top languages (top 10 repos):", data.languages);
      setUserLanguages(data.languages);
    } catch (error) {
      console.error("Error fetching user languages:", error);
    }
  }

  const handleEmailMentor = (mentorEmail: string, mentorName: string) => {
    const subject = encodeURIComponent("Mentorship Inquiry");
    const body = encodeURIComponent(
      `Hi ${mentorName},\n\nI came across your profile and would love to connect with you regarding mentorship opportunities.\n\nBest regards`
    );
    window.location.href = `mailto:${mentorEmail}?subject=${subject}&body=${body}`;
  };

  const mentors = useMemo(() => {
    if (rawMentors.length === 0 || userLanguages.length === 0) {
      return rawMentors;
    }

    const LANGUAGE_WEIGHT = 0.55;
    const PREFERENCE_WEIGHT = 0.45;

    const userPreferences = Array.isArray(preferences) ? preferences : [];

    const scoredMentors = rawMentors.map((mentor) => {
      let score = 0;

      if (mentor.languages && mentor.languages.length > 0) {
        let languageScore = 0;
        let matchCount = 0;

        userLanguages.forEach((userLang, userIndex) => {
          const mentorLangMatch = mentor.languages!.find(
            (mentorLang) =>
              mentorLang.lang.toLowerCase() === userLang.lang.toLowerCase()
          );

          if (mentorLangMatch) {
            const userWeight =
              (userLanguages.length - userIndex) / userLanguages.length;
            const mentorWeight = Number(mentorLangMatch.percentage) / 100;

            languageScore += userWeight * mentorWeight * 100;
            matchCount++;
          }
        });

        if (matchCount > 0) {
          languageScore = languageScore / userLanguages.length;
          score += languageScore * LANGUAGE_WEIGHT;
        }
      }

      if (
        userPreferences.length > 0 &&
        mentor.preferences &&
        Array.isArray(mentor.preferences) &&
        mentor.preferences.length > 0
      ) {
        const preferenceMatches = mentor.preferences.filter((mentorPref) =>
          userPreferences.some(
            (userPref: string) =>
              userPref.toLowerCase() === mentorPref.toLowerCase()
          )
        );

        if (preferenceMatches.length > 0) {
          const preferenceScore = Math.min(
            (preferenceMatches.length /
              Math.max(userPreferences.length, mentor.preferences.length)) *
              100,
            100
          );
          score += preferenceScore * PREFERENCE_WEIGHT;
        }
      }

      return { ...mentor, score: Math.round(score * 100) / 100 };
    });

    return scoredMentors.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [rawMentors, userLanguages, preferences]);

  const issues = useMemo(() => {
    if (rawIssues.length === 0) {
      return rawIssues;
    }

    if (userLanguages.length === 0) {
      return rawIssues.map((issue) => ({ ...issue, score: 0 }));
    }

    const RECENCY_WEIGHT = 0.2;
    const LANGUAGE_WEIGHT = 0.35;
    const TOPIC_WEIGHT = 0.45;
    const MAX_DAYS_FOR_SCORING = 180;

    const userPreferences = Array.isArray(preferences) ? preferences : [];

    const scoredIssues = rawIssues.map((issue) => {
      let score = 0;

      const daysForScore = Math.min(issue.daysOpen || 0, MAX_DAYS_FOR_SCORING);
      const recencyScore = (1 - daysForScore / MAX_DAYS_FOR_SCORING) * 100;
      score += recencyScore * RECENCY_WEIGHT;

      if (issue.primaryLanguage) {
        const languageMatch = userLanguages.find(
          (l) => l.lang.toLowerCase() === issue.primaryLanguage.toLowerCase()
        );

        if (languageMatch) {
          const langIndex = userLanguages.findIndex(
            (l) => l.lang.toLowerCase() === issue.primaryLanguage.toLowerCase()
          );
          const languageScore =
            ((userLanguages.length - langIndex) / userLanguages.length) * 100;
          score += languageScore * LANGUAGE_WEIGHT;
        }
      }

      if (
        userPreferences.length > 0 &&
        issue.repositoryTopics &&
        Array.isArray(issue.repositoryTopics)
      ) {
        const topicMatches = issue.repositoryTopics.filter((topic) =>
          userPreferences.some(
            (pref: string) => pref.toLowerCase() === topic.toLowerCase()
          )
        );

        if (topicMatches.length > 0) {
          const topicScore = Math.min(
            (topicMatches.length / userPreferences.length) * 100,
            100
          );
          score += topicScore * TOPIC_WEIGHT;
        }
      }

      return { ...issue, score: Math.round(score * 100) / 100 };
    });

    return scoredIssues.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [rawIssues, userLanguages, preferences]);

  const repositories = useMemo(() => {
    if (issues.length === 0) {
      return [];
    }

    const repoMap = new Map<string, Repository>();

    issues.forEach((issue) => {
      const repoKey = `${issue.repositoryOwner}/${issue.repositoryName}`;

      if (repoMap.has(repoKey)) {
        const existing = repoMap.get(repoKey)!;
        existing.issueCount += 1;
        const issueScore = issue.score || 0;
        existing.averageScore =
          (existing.averageScore * (existing.issueCount - 1) + issueScore) /
          existing.issueCount;
      } else {
        repoMap.set(repoKey, {
          repositoryOwner: issue.repositoryOwner,
          repositoryName: issue.repositoryName,
          repositoryTopics: issue.repositoryTopics,
          primaryLanguage: issue.primaryLanguage,
          issueCount: 1,
          averageScore: issue.score || 0,
        });
      }
    });

    return Array.from(repoMap.values()).sort(
      (a, b) => b.averageScore - a.averageScore
    );
  }, [issues]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#001E1E" }}
      >
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
          <p className="text-lg text-white">
            Loading your personalized feed...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#001E1E" }}>
      {/* Header */}
      <div
        className="border-b shadow-sm"
        style={{ backgroundColor: "#00312F", borderColor: "#014848" }}
      >
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Your GitHub Feed
              </h1>
              {session && (
                <p className="text-gray-200">
                  Welcome back, {username || session.user.email}!
                </p>
              )}
            </div>
            {session && (
              <div className="flex items-center gap-3">
                <a
                  href="/settings"
                  className="px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                  style={{ backgroundColor: "#005858" }}
                >
                  <Settings></Settings>
                </a>
                <button
                  onClick={signOut}
                  className="px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                  style={{ backgroundColor: "#8B0000" }}
                >
                  <LogOut></LogOut>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {session ? (
          <>
            {/* Mentor Recommendations Section */}
            {mentors.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Recommended Mentors
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mentors.slice(0, 3).map((mentor) => (
                    <div
                      key={mentor.id}
                      className="rounded-xl p-6 shadow-md border transition-all duration-300 hover:shadow-xl hover:scale-105"
                      style={{
                        backgroundColor: "#014848",
                        borderColor: "#005858",
                      }}
                    >
                      <div className="flex items-center mb-4">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mr-3"
                          style={{ backgroundColor: "#005858" }}
                        >
                          {mentor.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">
                            {mentor.username}
                          </h3>
                          <p className="text-sm text-gray-300">
                            {mentor.email}
                          </p>
                        </div>
                      </div>

                      {/* Match Score */}
                      <div
                        className="mb-4 px-3 py-2 rounded-lg"
                        style={{ backgroundColor: "#005858" }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">
                            Match Score
                          </span>
                          <span className="text-lg font-bold text-white">
                            {mentor.score !== undefined
                              ? mentor.score.toFixed(1)
                              : "0.0"}
                          </span>
                        </div>
                      </div>

                      {/* Languages */}
                      {mentor.languages && mentor.languages.length > 0 && (
                        <div className="mb-4">
                          <span className="text-xs font-medium text-gray-200 mb-2 block">
                            Languages:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {mentor.languages.slice(0, 3).map((lang) => (
                              <span
                                key={lang.lang}
                                className="px-2 py-1 rounded-md text-xs font-medium text-white"
                                style={{ backgroundColor: "#00312F" }}
                              >
                                {lang.lang}
                              </span>
                            ))}
                            {mentor.languages.length > 3 && (
                              <span className="text-xs text-gray-300 py-1">
                                +{mentor.languages.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Preferences */}
                      {mentor.preferences && mentor.preferences.length > 0 && (
                        <div className="mb-4">
                          <span className="text-xs font-medium text-gray-200 mb-2 block">
                            Interests:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {mentor.preferences.slice(0, 4).map((pref) => (
                              <span
                                key={pref}
                                className="px-2 py-1 rounded-md text-xs font-medium text-white"
                                style={{ backgroundColor: "#00312F" }}
                              >
                                {pref}
                              </span>
                            ))}
                            {mentor.preferences.length > 4 && (
                              <span className="text-xs text-gray-300 py-1">
                                +{mentor.preferences.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 mt-4">
                        <a
                          href={`https://github.com/${mentor.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white text-center transition-all duration-200 hover:scale-105"
                          style={{ backgroundColor: "#005858" }}
                        >
                          View Profile
                        </a>
                        <button
                          onClick={() =>
                            handleEmailMentor(mentor.email, mentor.username)
                          }
                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:scale-105"
                          style={{ backgroundColor: "#00312F" }}
                        >
                          Email Mentor
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Repository Recommendations Section */}
            {repositories.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Recommended Repositories
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {repositories.slice(0, 6).map((repo) => (
                    <div
                      key={`${repo.repositoryOwner}/${repo.repositoryName}`}
                      className="rounded-xl p-6 shadow-md border transition-all duration-300 hover:shadow-xl hover:scale-105"
                      style={{
                        backgroundColor: "#014848",
                        borderColor: "#005858",
                      }}
                    >
                      <a
                        href={`https://github.com/${repo.repositoryOwner}/${repo.repositoryName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold block mb-3 transition-colors text-white hover:opacity-80"
                      >
                        {repo.repositoryOwner}/{repo.repositoryName}
                      </a>

                      <div className="mb-4 flex items-center gap-3">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: "#005858" }}
                        >
                          {repo.primaryLanguage}
                        </span>
                        <span className="text-sm text-gray-200">
                          {repo.issueCount}{" "}
                          {repo.issueCount === 1 ? "issue" : "issues"}
                        </span>
                      </div>

                      {repo.repositoryTopics.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {repo.repositoryTopics.slice(0, 4).map((topic) => (
                            <span
                              key={topic}
                              className="px-2 py-1 rounded-md text-xs font-medium text-white"
                              style={{ backgroundColor: "#00312F" }}
                            >
                              {topic}
                            </span>
                          ))}
                          {repo.repositoryTopics.length > 4 && (
                            <span className="text-xs text-gray-300">
                              +{repo.repositoryTopics.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="text-sm font-medium text-gray-200">
                        Match Score: {repo.averageScore.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Recommended Issues
              </h2>
              <div className="space-y-6">
                {issues.map((issue) => (
                  <div
                    key={`${issue.repositoryOwner}-${issue.repositoryName}-${issue.issueNumber}`}
                    className="rounded-xl p-6 shadow-md border transition-all duration-300 hover:shadow-xl"
                    style={{
                      backgroundColor: "#005858",
                      borderColor: "#014848",
                    }}
                  >
                    {/* Repository Info */}
                    <div className="mb-4">
                      <a
                        href={`https://github.com/${issue.repositoryOwner}/${issue.repositoryName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium transition-colors text-white hover:opacity-80"
                      >
                        {issue.repositoryOwner}/{issue.repositoryName}
                      </a>
                      <h2 className="text-xl font-semibold text-white mt-2">
                        <a
                          href={issue.issueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-80 transition-opacity"
                        >
                          {issue.issueTitle}
                        </a>
                      </h2>
                      <p className="text-sm text-gray-200 mt-1">
                        #{issue.issueNumber} opened {issue.daysOpen} days ago •
                        Match Score: {issue.score}
                      </p>
                    </div>

                    {/* Issue Body Preview */}
                    {issue.issueBody && (
                      <p className="text-gray-100 mb-4 line-clamp-3">
                        {issue.issueBody.substring(0, 200)}
                        {issue.issueBody.length > 200 ? "..." : ""}
                      </p>
                    )}

                    {/* Languages */}
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-200 mr-2">
                        Primary Language:
                      </span>
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: "#014848" }}
                      >
                        {issue.primaryLanguage}
                      </span>

                      {issue.allLanguages.length > 1 && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-200">
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
                        <span className="text-sm font-medium text-gray-200 mr-2">
                          Topics:
                        </span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {issue.repositoryTopics.map((topic) => (
                            <span
                              key={topic}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white"
                              style={{ backgroundColor: "#00312F" }}
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Labels */}
                    {issue.issueLabels.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {issue.issueLabels.map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: "#014848" }}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Button */}
                    <div
                      className="mt-4 pt-4"
                      style={{ borderTop: "1px solid #014848" }}
                    >
                      <a
                        href={issue.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-6 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:scale-105"
                        style={{ backgroundColor: "#014848" }}
                      >
                        View Issue on GitHub
                        <svg
                          className="ml-2 w-4 h-4"
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
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div
              className="rounded-xl p-8 shadow-md inline-block border"
              style={{ backgroundColor: "#014848", borderColor: "#005858" }}
            >
              <p className="text-xl text-white mb-4">You are not logged in</p>
              <a
                href="/login"
                className="inline-block px-6 py-3 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: "#005858" }}
              >
                Sign In to Continue
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}