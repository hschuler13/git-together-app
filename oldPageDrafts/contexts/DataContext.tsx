"use client";
import { createContext, useContext } from "react";

export interface GitHubIssue {
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

export interface Repository {
  repositoryOwner: string;
  repositoryName: string;
  repositoryTopics: string[];
  primaryLanguage: string;
  issueCount: number;
  averageScore: number;
}

interface DataContextType {
  issues: GitHubIssue[];
  repositories: Repository[];
  loading: boolean;
  error: string | null;
}

export const DataContext = createContext<DataContextType>({
  issues: [],
  repositories: [],
  loading: true,
  error: null,
});

export const useData = () => useContext(DataContext);