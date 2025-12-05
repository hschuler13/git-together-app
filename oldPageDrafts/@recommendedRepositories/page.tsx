"use client";
import { useData } from "@/app/contexts/DataContext";

export default function RepositoriesSlot() {
  const { repositories, loading } = useData();

  if (loading) {
    return (
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Recommended Repositories</h2>
        <p className="text-gray-600">Loading repositories...</p>
      </div>
    );
  }

  if (repositories.length === 0) {
    return null;
  }

  return (
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
  );
}