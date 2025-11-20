'use client'

import { createClient } from "../utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/home');
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/home');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  async function signInWithGithub() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        prompt: 'consent'  // Forces GitHub to show the authorization screen
      }
    },
  });
  
  if (error) {
    console.error('Error signing in:', error);
  }
}

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gray-50 w-screen">
      <h1 className="text-5xl font-bold mb-4 pb-[1%]">Welcome to gitTogether</h1>
      <button onClick={signInWithGithub} className=" bg-black text-white rounded-lg hover:bg-gray-700 p-2.5">
        Sign in with GitHub
      </button>
    </div>
    </>
  );
}