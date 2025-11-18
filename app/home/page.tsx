"use client";
import { createClient } from "../utils/supabase/client";
import { useEffect, useState } from "react";

export default function Home() {
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<any[]>([]);
  const [topIssues, setTopIssues] = useState<any[]>([]);
  const [userLanguages, setUserLanguages] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<any>(null); // store user preferences

  useEffect(() => {
    // fetch session and watch for auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        const username = session.user.user_metadata?.user_name;
        if (username) fetchUserLanguages(username);
        fetchUserPreferences(session.user.id); // fetch preferences
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        const username = session.user.user_metadata?.user_name;
        if (username) fetchUserLanguages(username);
        fetchUserPreferences(session.user.id); // fetch preferences on change too
      }
    });

    loadIssues();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (issues && issues.length > 0) {
      const k = 5;
      const top = [...issues]
        .sort((a, b) => Number(b.newcomer_score) - Number(a.newcomer_score))
        .slice(0, k);
      setTopIssues(top);
    }
  }, [issues]);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      setSession(null);
      window.location.href = "/login";
    }
  }

  async function loadIssues() {
    const { data } = await supabase.from("issues").select("*");
    if (data) setIssues(data);
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

  async function sortLanguages() {
    const { data: issues } = await supabase.from("issues").select("*");
    const { data: profiles } = await supabase.from("profiles").select("*");

    const k1 = 0.2;
    const k2 = 0.35;
    const k3 = 0;

    issues!.forEach((issue) => {
      var score = 0;
      if (issue!.days_open <= 90) {
        score += issue.days_open * k1;
      }
      const match = userLanguages.some(
        (l) => l.lang.toLowerCase() === issue.primary_language.toLowerCase()
      );
      if (match) {
        score += userLanguages.findIndex(l => l.lang === issue.primary_language) * k2
      }
      const match2 = 0;
    });
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

            <div className="space-y-4 grid-rows-3">
              <h2 className="text-2xl font-semibold">Issues</h2>
              <div className="border border-black rounded-md row-span-2">
                {topIssues.map((issue) => (
                  <a href={issue.url} key={issue.id}>
                    <div className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-lg">{issue.title}</h3>
                      {issue.body && (
                        <p className="text-gray-600 mt-2">{issue.body}</p>
                      )}
                    </div>
                  </a>
                ))}
              </div>

              {/* Display user languages */}
              <div className="mt-8 row-span-1">
                <h2 className="text-2xl font-semibold">Your Top Languages</h2>
                {userLanguages.length > 0 ? (
                  <ul className="list-disc ml-6 mt-2">
                    {userLanguages.map((lang) => (
                      <li key={lang.lang}>
                        {lang.lang}: {lang.percentage}%
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 mt-2">
                    Fetching your GitHub language stats...
                  </p>
                )}
              </div>

              {/* Display user preferences */}
              <div className="mt-8 row-span-1">
                <h2 className="text-2xl font-semibold">Your Preferences</h2>
                {preferences ? (
                  <pre className="bg-gray-100 p-4 rounded-lg mt-2 overflow-x-auto">
                    {JSON.stringify(preferences, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-600 mt-2">No preferences found.</p>
                )}
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
