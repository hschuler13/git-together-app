"use client";
import { useData } from "@/app/contexts/DataContext";

export default function IssuesSlot() {
  const { issues, loading } = useData();

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Recommended Issues</h2>
        <p className="text-gray-600">Loading issues...</p>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Recommended Issues</h2>
        <p className="text-gray-600">No issues found</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Recommended Issues</h2>
      <div className="space-y-6">
        {issues.map((issue) => (
          <article
            key={`${issue.repositoryOwner}-${issue.repositoryName}-${issue.issueNumber}`}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
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

            {issue.issueBody && (
              <p className="text-gray-700 mb-4 line-clamp-3">
                {issue.issueBody.substring(0, 200)}
                {issue.issueBody.length > 200 ? "..." : ""}
              </p>
            )}

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
  );
}