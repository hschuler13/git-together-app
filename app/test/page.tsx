'use client';

import { useEffect, useState } from 'react';

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
}

export default function Home() {
  // Filter issues created within the last X months (adjust as needed)
  const MAX_AGE_MONTHS = 3;
  
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterRecentIssues = (issues: GitHubIssue[]): GitHubIssue[] => {
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - MAX_AGE_MONTHS);
    
    return issues.filter(issue => {
      const issueDate = new Date(issue.dateCreated);
      return issueDate >= monthsAgo;
    });
  };

  useEffect(() => {
    async function fetchIssues() {
      try {
        const response = await fetch('/api/github-issues');
        const data = await response.json();
        
        if (data.success) {
          const recentIssues = filterRecentIssues(data.issues);
          setIssues(recentIssues);
        } else {
          setError(data.error || 'Failed to fetch issues');
        }
      } catch (err) {
        setError('An error occurred while fetching issues');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchIssues();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading issues...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Good First Issues
          </h1>
          <p className="text-gray-600">
            Found {issues.length} open issues from the past {MAX_AGE_MONTHS} months perfect for beginners
          </p>
        </header>

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
                    #{issue.issueNumber} opened {issue.daysOpen} days ago
                  </p>
                </div>
              </div>

              {/* Issue Body Preview */}
              {issue.issueBody && (
                <p className="text-gray-700 mb-4 line-clamp-3">
                  {issue.issueBody.substring(0, 200)}
                  {issue.issueBody.length > 200 ? '...' : ''}
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
                      Also uses: {issue.allLanguages.filter(lang => lang !== issue.primaryLanguage).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Topics */}
              {issue.repositoryTopics.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-700 mr-2">Topics:</span>
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

        {issues.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No good first issues found at the moment. Check back later!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}