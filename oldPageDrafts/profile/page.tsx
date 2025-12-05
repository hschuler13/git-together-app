'use client'
import { createClient } from "../utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js"; // Import Session type

// Interfaces remain the same for GitHubUser, GitHubRepo, SkillLevel

interface GitHubUser {
  login: string;
  name: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  avatar_url: string;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  language: string;
  stargazers_count: number;
  fork: boolean;
  updated_at: string;
  has_issues: boolean;
  open_issues_count: number;
  topics: string[];
}

type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

// --- Define the Mentor's GitHub Username ---
const MENTOR_GITHUB_USERNAME = "torvalds"; // Example: Linus Torvalds

export default function Profile() {
  const router = useRouter();
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);

  useEffect(() => {
    // 1. Check for user session (for authentication status display and sign out)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    
    // 2. Fetch the MENTOR's GitHub data immediately, regardless of the user's login status
    //    (as long as the user is not actively loading the session, to prevent race conditions)
    if (!loading) {
        fetchMentorGitHubData(MENTOR_GITHUB_USERNAME);
    }

    // 3. Set up auth state change listener (remains for user sign in/out logic)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT') {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, loading]); // Added 'loading' as a dependency to trigger the initial mentor fetch

  // The calculation function remains the same, but it will now calculate the MENTOR's skill level
  function calculateSkillLevel(user: GitHubUser, repos: GitHubRepo[]): SkillLevel {
    // ... (calculateSkillLevel implementation remains unchanged) ...
    const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const originalRepos = repos.filter(repo => !repo.fork).length;
    const accountAgeYears = (new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
    const reposWithTopics = repos.filter(repo => repo.topics && repo.topics.length > 0).length;
    const avgStarsPerRepo = originalRepos > 0 ? totalStars / originalRepos : 0;
    
    let score = 0;
    
    if (user.public_repos >= 20) score += 3;
    else if (user.public_repos >= 10) score += 2;
    else if (user.public_repos >= 5) score += 1;
    
    if (user.followers >= 50) score += 3;
    else if (user.followers >= 20) score += 2;
    else if (user.followers >= 10) score += 1;
    
    if (totalStars >= 100) score += 3;
    else if (totalStars >= 25) score += 2;
    else if (totalStars >= 5) score += 1;
    
    if (originalRepos >= 15) score += 2;
    else if (originalRepos >= 8) score += 1;
    
    if (accountAgeYears >= 3) score += 2;
    else if (accountAgeYears >= 1) score += 1;
    
    if (reposWithTopics >= 10) score += 2;
    else if (reposWithTopics >= 5) score += 1;
    
    if (avgStarsPerRepo >= 10) score += 2;
    else if (avgStarsPerRepo >= 3) score += 1;
    
    if (score >= 12) return 'advanced';
    if (score >= 6) return 'intermediate';
    return 'beginner';
  }

  // --- NEW FUNCTION: Fetches the Mentor's public data ---
  async function fetchMentorGitHubData(username: string) {
    setDataLoading(true);
    setDataError(null);

    try {
      // Public API call for user profile
      const userResponse = await fetch(`https://api.github.com/users/${username}`, {
        // No Authorization header needed for public data, but we keep the Accept header
        headers: { Accept: 'application/vnd.github.v3+json' }
      });

      if (!userResponse.ok) {
        throw new Error(`GitHub API error: ${userResponse.status} - ${username} not found.`);
      }

      const userData: GitHubUser = await userResponse.json();
      setGithubUser(userData);

      // Public API call for repos
      const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=public`, {
        headers: { Accept: 'application/vnd.github.v3+json' }
      });

      if (!reposResponse.ok) {
        throw new Error(`GitHub API error: ${reposResponse.status} for repos.`);
      }

      const reposData: GitHubRepo[] = await reposResponse.json();
      setRepos(reposData);
      
      const level = calculateSkillLevel(userData, reposData);
      setSkillLevel(level);
      
    } catch (err: any) {
      console.error('Error fetching GitHub data:', err);
      setDataError(err.message);
    } finally {
      setDataLoading(false);
    }
  }
    
  // --- Removed the old fetchGitHubData(session: any) function ---

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      setSession(null);
      window.location.href = '/login';
    }
  }

  function getSkillLevelColor(level: SkillLevel | null): string {
    // ... (getSkillLevelColor implementation remains unchanged) ...
    if (!level) return 'bg-gray-200 text-gray-800';
    switch (level) {
      case 'beginner':
        return 'bg-green-200 text-green-800';
      case 'intermediate':
        return 'bg-blue-200 text-blue-800';
      case 'advanced':
        return 'bg-purple-200 text-purple-800';
    }
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
        <h1 className="text-3xl font-bold mb-4">Mentor Profile: {MENTOR_GITHUB_USERNAME}</h1> 
        {session ? (
          <div className="flex items-center justify-between">
            <p className="text-lg">
              Signed in as: {session.user.email || session.user.user_metadata?.user_name}
            </p>
            <button 
              onClick={signOut}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div>
            <p>You are not logged in</p>
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>

      { /* The rest of the display logic uses githubUser and repos */ }
      <div>
        {dataLoading && (
          <p className="text-gray-600">Loading GitHub data for {MENTOR_GITHUB_USERNAME}...</p>
        )}

        {dataError && (
          <div className="text-red-600 mb-4">
            <p>Error: {dataError}</p>
          </div>
        )}

        {!dataLoading && !dataError && githubUser && (
          <div>
            <div className="mb-8 border p-6 rounded">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">GitHub Profile ({githubUser.name || githubUser.login})</h2>
                {skillLevel && (
                  <span className={`px-4 py-2 rounded text-sm font-semibold ${getSkillLevelColor(skillLevel)}`}>
                    {skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}
                  </span>
                )}
              </div>
              {/* ... rest of the profile display (remains unchanged) ... */}
              <div className="flex items-start gap-6">
                <img 
                  src={githubUser.avatar_url} 
                  alt={githubUser.name}
                  className="w-24 h-24 rounded"
                />
                <div>
                  <h3 className="text-xl font-semibold">{githubUser.name}</h3>
                  <p className="text-gray-600">@{githubUser.login}</p>
                  {githubUser.bio && (
                    <p className="mt-2 text-gray-700">{githubUser.bio}</p>
                  )}
                  <div className="flex gap-4 mt-3 text-sm">
                    <span>Public Repos: {githubUser.public_repos}</span>
                    <span>Followers: {githubUser.followers}</span>
                    <span>Following: {githubUser.following}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Joined: {new Date(githubUser.created_at).toLocaleDateString()}</p>
                    <p>Updated: {new Date(githubUser.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Repositories</h2>
              <p className="mb-4 text-gray-600">Found {repos.length} repositories for {githubUser.login}</p>
              
              <div className="space-y-4">
                {repos.map((repo) => (
                  <div key={repo.full_name} className="border p-4 rounded">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">{repo.name}</h3>
                        <p className="text-sm text-gray-500">{repo.full_name}</p>
                      </div>
                      {repo.fork && (
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">Fork</span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mt-2">
                      {repo.description || 'No description'}
                    </p>
                    
                    {repo.topics && repo.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {repo.topics.map((topic) => (
                          <span 
                            key={topic}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-4 mt-3 text-sm text-gray-500">
                      <span>Stars: {repo.stargazers_count}</span>
                      <span>Language: {repo.language || 'Unknown'}</span>
                      {repo.has_issues && (
                        <span>Open Issues: {repo.open_issues_count}</span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-2">
                      Updated: {new Date(repo.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!dataLoading && !dataError && repos.length === 0 && githubUser && (
          <p className="text-gray-600">No repositories found for {githubUser.login}.</p>
        )}
      </div>
    </div>
  );
}