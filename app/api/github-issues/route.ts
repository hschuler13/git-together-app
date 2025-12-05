import { NextResponse } from 'next/server';

const REPOSITORIES = [
  'microsoft/vscode',
  'facebook/react',
  'vercel/next.js',
  'nodejs/node',
  'rust-lang/rust',
  'golang/go',
  'tensorflow/tensorflow',
  'kubernetes/kubernetes',
  'ansible/ansible',
  'django/django'
];

const GFI_LABELS = [
  'good first issue',
  'good-first-issue',
  'beginner',
  'easy',
  'starter',
  'first-timers-only',
  'help wanted'
];

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

async function fetchWithAuth(url: string) {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    console.warn('GITHUB_TOKEN not found. API rate limits will be restricted to 60 requests/hour.');
  }
  
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorBody}`);
  }
  
  return response.json();
}

function hasGoodFirstIssueLabel(labels: any[]): boolean {
  return labels.some(label => 
    GFI_LABELS.some(gfi => 
      label.name.toLowerCase().includes(gfi.toLowerCase())
    )
  );
}

function calculateDaysOpen(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function fetchRepositoryLanguages(owner: string, repo: string): Promise<string[]> {
  try {
    const languages = await fetchWithAuth(`https://api.github.com/repos/${owner}/${repo}/languages`);
    return Object.keys(languages);
  } catch (error) {
    console.error(`Error fetching languages for ${owner}/${repo}:`, error);
    return [];
  }
}

async function fetchRepositoryDetails(owner: string, repo: string) {
  try {
    const repoData = await fetchWithAuth(`https://api.github.com/repos/${owner}/${repo}`);
    return {
      primaryLanguage: repoData.language || 'Unknown',
      topics: repoData.topics || []
    };
  } catch (error) {
    console.error(`Error fetching repo details for ${owner}/${repo}:`, error);
    return {
      primaryLanguage: 'Unknown',
      topics: []
    };
  }
}

async function fetchIssuesFromRepository(repo: string): Promise<GitHubIssue[]> {
  const [owner, name] = repo.split('/');
  
  try {
    const repoDetails = await fetchRepositoryDetails(owner, name);
    const allLanguages = await fetchRepositoryLanguages(owner, name);
    
    const issues = await fetchWithAuth(
      `https://api.github.com/repos/${repo}/issues?state=open&labels=good%20first%20issue&per_page=100`
    );
    
    const processedIssues: GitHubIssue[] = issues
      .filter((issue: any) => 
        !issue.pull_request && 
        issue.assignees.length === 0 && 
        hasGoodFirstIssueLabel(issue.labels) 
      )
      .map((issue: any) => ({
        issueUrl: issue.html_url,
        primaryLanguage: repoDetails.primaryLanguage,
        allLanguages,
        repositoryOwner: owner,
        repositoryName: name,
        repositoryTopics: repoDetails.topics,
        issueNumber: issue.number,
        issueTitle: issue.title,
        issueBody: issue.body || '',
        issueLabels: issue.labels.map((label: any) => label.name),
        numberOfAssignees: issue.assignees.length,
        hasGFILabel: true,
        dateCreated: issue.created_at,
        daysOpen: calculateDaysOpen(issue.created_at),
        score: 0
      }));
    
    return processedIssues;
  } catch (error) {
    console.error(`Error fetching issues from ${repo}:`, error);
    return [];
  }
}

export async function GET() {
  try {
    const issuesPromises = REPOSITORIES.map(repo => fetchIssuesFromRepository(repo));
    const issuesArrays = await Promise.all(issuesPromises);
    
    const allIssues = issuesArrays
      .flat()
      .sort((a, b) => a.daysOpen - b.daysOpen);
    
    return NextResponse.json({
      success: true,
      count: allIssues.length,
      issues: allIssues
    });
  } catch (error) {
    console.error('Error fetching GitHub issues:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}

