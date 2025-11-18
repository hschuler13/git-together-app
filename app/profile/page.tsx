'use client'
import { createClient } from "../utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function Profile() {
  const router = useRouter();
  const supabase = createClient();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      
      if (session) {
        fetchGitHubData(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setGithubUser(null);
        setRepos([]);
        setSkillLevel(null);
      } else if (event === 'SIGNED_IN' && session) {
        fetchGitHubData(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  function calculateSkillLevel(user: GitHubUser, repos: GitHubRepo[]): SkillLevel {
    // Calculate total stars across all repos
    const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    
    // Count original repos (non-forks)
    const originalRepos = repos.filter(repo => !repo.fork).length;
    
    // Calculate account age in years
    const accountAgeYears = (new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    // Count repos with topics (indicates documentation/organization)
    const reposWithTopics = repos.filter(repo => repo.topics && repo.topics.length > 0).length;
    
    // Calculate average stars per repo (for original repos only)
    const avgStarsPerRepo = originalRepos > 0 ? totalStars / originalRepos : 0;
    
    // Scoring system
    let score = 0;
    
    // Public repos contribution
    if (user.public_repos >= 20) score += 3;
    else if (user.public_repos >= 10) score += 2;
    else if (user.public_repos >= 5) score += 1;
    
    // Followers contribution
    if (user.followers >= 50) score += 3;
    else if (user.followers >= 20) score += 2;
    else if (user.followers >= 10) score += 1;
    
    // Stars contribution
    if (totalStars >= 100) score += 3;
    else if (totalStars >= 25) score += 2;
    else if (totalStars >= 5) score += 1;
    
    // Original repos contribution
    if (originalRepos >= 15) score += 2;
    else if (originalRepos >= 8) score += 1;
    
    // Account age contribution
    if (accountAgeYears >= 3) score += 2;
    else if (accountAgeYears >= 1) score += 1;
    
    // Repos with topics (shows good practices)
    if (reposWithTopics >= 10) score += 2;
    else if (reposWithTopics >= 5) score += 1;
    
    // Average stars per repo
    if (avgStarsPerRepo >= 10) score += 2;
    else if (avgStarsPerRepo >= 3) score += 1;
    
    // Determine skill level based on score
    if (score >= 12) return 'advanced';
    if (score >= 6) return 'intermediate';
    return 'beginner';
  }

  async function fetchGitHubData(session: any) {
    setDataLoading(true);
    setDataError(null);

    try {
      if (!session.provider_token) {
        setDataError('No GitHub access token available');
        setDataLoading(false);
        return;
      }

      const token = session.provider_token;
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      };

      const userResponse = await fetch('https://api.github.com/user', {
        headers
      });

      if (!userResponse.ok) {
        throw new Error(`GitHub API error: ${userResponse.status}`);
      }

      const userData: GitHubUser = await userResponse.json();
      console.log('GitHub User Data:', userData);
      setGithubUser(userData);

      const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers
      });

      if (!reposResponse.ok) {
        throw new Error(`GitHub API error: ${reposResponse.status}`);
      }

      const reposData: GitHubRepo[] = await reposResponse.json();
      console.log('GitHub Repositories:', reposData);
      console.log('Total repos:', reposData.length);
      
      setRepos(reposData);
      
      // Calculate and set skill level
      const level = calculateSkillLevel(userData, reposData);
      setSkillLevel(level);
      console.log('Calculated Skill Level:', level);
      
    } catch (err: any) {
      console.error('Error fetching GitHub data:', err);
      setDataError(err.message);
    } finally {
      setDataLoading(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      setSession(null);
      setGithubUser(null);
      setRepos([]);
      setSkillLevel(null);
      window.location.href = '/login';
    }
  }

  function getSkillLevelColor(level: SkillLevel | null): string {
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
        <h1 className="text-3xl font-bold mb-4">Home Page</h1>
        {session ? (
          <div className="flex items-center justify-between">
            <p className="text-lg">
              Welcome, {session.user.email || session.user.user_metadata?.user_name}!
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

      {session && (
        <div>
          {dataLoading && (
            <p className="text-gray-600">Loading GitHub data...</p>
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
                  <h2 className="text-2xl font-bold">GitHub Profile</h2>
                  {skillLevel && (
                    <span className={`px-4 py-2 rounded text-sm font-semibold ${getSkillLevelColor(skillLevel)}`}>
                      {skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}
                    </span>
                  )}
                </div>
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
                <h2 className="text-2xl font-bold mb-4">Your Repositories</h2>
                <p className="mb-4 text-gray-600">Found {repos.length} repositories</p>
                
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
            <p className="text-gray-600">No repositories found.</p>
          )}
        </div>
      )}
    </div>
  );
}

//adjust window closed to sign out perhaps ?