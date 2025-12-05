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
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#001E1E' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
          <p className="text-lg text-white">Loading login...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-[#001E1E] w-screen">
      <h1 className="text-5xl font-bold mb-4 pb-[1%] text-white">Welcome to gitTogether</h1>
      <button onClick={signInWithGithub} className=" bg-[#005858] text-white rounded-lg p-2.5"> {/* TODO: add this back in maybe idk -> hover:bg-[#014848] */}
        Sign in with GitHub
      </button>
    </div>
    </>
  );
}
