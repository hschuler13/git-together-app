// app/issues/page.tsx (App Router) or pages/issues.tsx (Pages Router)
'use client'; // Remove this line if using Pages Router

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Scoring functions
function calculateTopicScore(taskTopics: string[], userPreferredTopics: string[]) {
  const k = 0.45;
  const matchingTopics = taskTopics.filter(topic => 
    userPreferredTopics.includes(topic)
  );
  const percentage = matchingTopics.length / userPreferredTopics.length;
  return percentage * k;
}

function calculateLanguageScore(taskLanguages: string[], userLanguages: string[]) {
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
  const k = 0.20;
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
    .from('users')
    .select('preferredTopics, languages')
    .eq('id', userId)
    .single();
  
  if (userError) throw userError;
  
  const { data: issues, error: issuesError } = await supabase
    .from('issues')
    .select('*');
  
  if (issuesError) throw issuesError;
  
  const scoredIssues = issues
    .map(issue => {
      const totalScore = calculateTotalScore(issue, user);
      if (totalScore === null) return null;
      return { ...issue, totalScore };
    })
    .filter(issue => issue !== null)
    .sort((a, b) => b.totalScore - a.totalScore);
  
  return {
    allSorted: scoredIssues,
    top5: scoredIssues.slice(0, 5)
  };
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [allIssues, setAllIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadIssues();
  }, []);

  async function loadIssues() {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user from Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No user logged in');
      }

      const { allSorted, top5 } = await getSortedIssues(user.id);
      setAllIssues(allSorted);
      setIssues(top5);
      setLoading(false);
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading recommended issues...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Error Loading Issues</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadIssues}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Recommended Issues
          </h1>
          <p className="text-gray-600">
            Issues curated based on your interests and expertise
          </p>
        </div>

        {/* Issues List */}
        <div className="space-y-4">
          {issues.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">No issues match your preferences at this time.</p>
            </div>
          ) : (
            issues.map((issue, index) => (
              <div 
                key={issue.id} 
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition p-6 border border-gray-200"
              >
                {/* Rank Badge */}
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 font-semibold rounded-full text-sm">
                    #{index + 1}
                  </span>
                  <span className="text-sm text-gray-500">
                    Score: {issue.totalScore.toFixed(2)}
                  </span>
                </div>

                {/* Issue Title */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {issue.title || 'Untitled Issue'}
                </h3>

                {/* Issue Description */}
                {issue.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {issue.description}
                  </p>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* Topics */}
                  {issue.topics && issue.topics.map((topic: string, i: number) => (
                    <span 
                      key={`topic-${i}`}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                  
                  {/* Languages */}
                  {issue.taskLanguage && issue.taskLanguage.map((lang: string, i: number) => (
                    <span 
                      key={`lang-${i}`}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>📅 {issue.daysSincePublished} days ago</span>
                  {issue.repository && <span>📦 {issue.repository}</span>}
                </div>

                {/* Action Button */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-medium">
                    View Issue
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Show More/Less Button */}
        {allIssues.length > 5 && (
          <div className="mt-6 text-center">
            <button
              onClick={toggleShowAll}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300 transition font-medium"
            >
              {showAll ? 'Show Top 5 Only' : `Show All ${allIssues.length} Issues`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}