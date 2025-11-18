"use client";
import { createClient } from "../utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase/supabase";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<any[]>([]);
  const [allIssues, setAllIssues] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function issuesDisplay() {
    const { data: issues } = await supabase.from("issues").select("title");
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "SIGNED_OUT") {
        setSession(null);
      }
    });
    loadIssues();
    issuesDisplay()
    return () => subscription.unsubscribe();
  }, [supabase]);

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
    try {
      setLoading(true);
      setError(null);

      // Get current user from Supabase Auth
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("No user logged in");
      } else {
        const { allSorted, top5 } = await getSortedIssues(user.id);
        setAllIssues(allSorted);
        setIssues(top5);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  function toggleShowAll() {
    setShowAll(!showAll);
    setIssues(showAll ? allIssues.slice(0, 5) : allIssues);
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
          <div className="flex items-center justify-between">
            <p className="text-lg">
              Welcome,{" "}
              {session.user.email || session.user.user_metadata?.user_name}!
            </p>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sign Out
            </button>
            <div>
              {issues.map((item) => (
              <li key={item.id}>{item.title}</li> // Replace 'id' and 'column_name'
            ))}
            </div>
          </div>
        ) : (
          <div>
            <p>You are not logged in</p>
            <button
              onClick={() => router.push("/login")}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

///////////////////////////////////////

// app/issues/page.tsx (App Router) or pages/issues.tsx (Pages Router)

// Scoring functions
function calculateTopicScore(
  taskTopics: string[],
  userPreferredTopics: string[]
) {
  const k = 0.45;
  const matchingTopics = taskTopics.filter((topic) =>
    userPreferredTopics.includes(topic)
  );
  const percentage = matchingTopics.length / userPreferredTopics.length;
  return percentage * k;
}

function calculateLanguageScore(
  taskLanguages: string[],
  userLanguages: string[]
) {
  const k = 0.35;
  let totalScore = 0;
  for (const language of taskLanguages) {
    const languageIndex = userLanguages.indexOf(language);
    if (languageIndex !== -1) {
      totalScore += Math.pow(0.2, languageIndex);
    }
  }
  return totalScore * k;
}

function calculateDateScore(daysSincePublished: number, cutoffDays = 90) {
  const k = 0.2;
  if (daysSincePublished <= cutoffDays) {
    return daysSincePublished * k;
  }
  return null;
}

function calculateTotalScore(task: any, userPreferences: any) {
  const topicScore = calculateTopicScore(
    task.topics || [],
    userPreferences.preferredTopics || []
  );
  const languageScore = calculateLanguageScore(
    task.taskLanguage || [],
    userPreferences.languages || []
  );
  const dateScore = calculateDateScore(task.daysSincePublished);

  if (dateScore === null) return null;
  return topicScore + languageScore + dateScore;
}

async function getSortedIssues(userId: string) {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("preferredTopics, languages")
    .eq("id", userId)
    .single();

  if (userError) throw userError;

  const { data: issues } = await supabase.from("issues").select();

  const scoredIssues = issues!
    .map((issue) => {
      const totalScore = calculateTotalScore(issue, user);
      if (totalScore === null) return null;
      return { ...issue, totalScore };
    })
    .filter((issue) => issue !== null)
    .sort((a, b) => b.totalScore - a.totalScore);

  return {
    allSorted: scoredIssues,
    top5: scoredIssues.slice(0, 5),
  };
}