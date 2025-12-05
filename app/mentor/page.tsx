"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';

export default function Mentor() {
  const router = useRouter();
  const [supabase] = useState(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserAndMentorStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      setIsLoading(false);
    };

    checkUserAndMentorStatus();
  }, [supabase, router]);

  async function handleMentorChoice(isMentor) {
    if (!user) {
      alert("Please log in to save your mentor status");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ mentor_status: isMentor })
        .eq('id', user.id);

      if (updateError) {
        console.error("Error updating mentor status:", updateError);
        alert("Failed to save mentor status. Please try again.");
      } else {
        router.push("/home");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#001E1E' }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mt-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-12">
            Would you like to be a mentor?
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={() => handleMentorChoice(true)}
              disabled={isSubmitting || !user}
              className="px-12 py-4 text-xl font-semibold text-white rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#005858' }}
            >
              {isSubmitting ? 'Saving...' : 'Yes'}
            </button>
            
            <button
              onClick={() => handleMentorChoice(false)}
              disabled={isSubmitting || !user}
              className="px-12 py-4 text-xl font-semibold text-white rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#00312F', border: '1px solid #014848' }}
            >
              {isSubmitting ? 'Saving...' : 'No'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}