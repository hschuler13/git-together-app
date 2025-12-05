"use client";
import { createClient } from "../utils/supabase/client";
import { useEffect, useState } from "react";
import {
  DataContext,
  GitHubIssue,
  Repository,
} from "@/app/contexts/DataContext";

export default function Layout({
  children
}: {
  children: React.ReactNode;

}) {

  return (
      <>{children}</>
     
  );
}
