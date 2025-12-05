"use client";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';

export default function PreferencesPage() {
  const router = useRouter();
  const [supabase] = useState(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  const topics = [
    { id: 1, name: "javascript" },
    { id: 2, name: "python" },
    { id: 3, name: "java" },
    { id: 4, name: "react" },
    { id: 5, name: "html" },
    { id: 6, name: "css" },
    { id: 7, name: "nodejs" },
    { id: 8, name: "typescript" },
    { id: 9, name: "csharp" },
    { id: 10, name: "vue" },
    { id: 11, name: "docker" },
    { id: 12, name: "kubernetes" },
    { id: 13, name: "machine-learning" },
    { id: 14, name: "deep-learning" },
    { id: 15, name: "data-science" },
    { id: 16, name: "Marketing Emails" },
    { id: 17, name: "graphql" },
    { id: 18, name: "android" },
    { id: 19, name: "ios" },
    { id: 20, name: "flutter" },
  ];

  const filteredPreferences = topics.filter((pref) =>
    pref.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePreference = (id) => {
    setSelectedPreferences((prev) =>
      prev.includes(id) ? prev.filter((prefId) => prefId !== id) : [...prev, id]
    );
  };


  async function handleSubmit() {
  if (!user) {
    alert("Please log in to save preferences");
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    const selectedPreferenceNames = topics
      .filter(topic => selectedPreferences.includes(topic.id))
      .map(topic => topic.name);
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ preferences: selectedPreferenceNames })
      .eq('id', user.id);
    
    if (updateError) {
      console.error("Error updating preferences:", updateError);
      alert("Failed to save preferences. Please try again.");
      return;
    }
    
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('mentor_status')
      .eq('id', user.id)
      .single();
    
    if (fetchError) {
      console.error("Error fetching profile:", fetchError);
      alert("Failed to fetch profile information");
      return;
    }
    
    console.log("Profile mentor_status:", profile?.mentor_status);
    
    if (profile?.mentor_status === null || profile?.mentor_status === undefined) {
      console.log("Redirecting to /mentor");
      router.push("/mentor");
    } else {
      console.log("Redirecting to /home");
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
        <h1 className="text-3xl font-bold text-white mb-8">Preferences</h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-200 w-5 h-5" />
          <input
            type="text"
            placeholder="Search preferences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 text-white placeholder-gray-300 border"
            style={{ 
              backgroundColor: '#00312F', 
              borderColor: '#014848',
              focusRingColor: '#005858'
            }}
          />
        </div>

        {searchQuery && (
          <p className="text-sm text-gray-200 mb-4">
            {filteredPreferences.length} result
            {filteredPreferences.length !== 1 ? "s" : ""} found
          </p>
        )}

        {selectedPreferences.length > 0 && (
          <div className="mt-4 p-4 rounded-lg mb-4 border" style={{ backgroundColor: '#014848', borderColor: '#005858' }}>
            <p className="text-sm text-white">
              {selectedPreferences.length} preference
              {selectedPreferences.length !== 1 ? "s" : ""} selected
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {filteredPreferences.length > 0 ? (
            filteredPreferences.map((pref) => (
              <button
                key={pref.id}
                onClick={() => togglePreference(pref.id)}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                style={
                  selectedPreferences.includes(pref.id)
                    ? { backgroundColor: '#005858', color: 'white' }
                    : { backgroundColor: '#014848', color: 'white', border: '1px solid #005858' }
                }
              >
                {pref.name}
              </button>
            ))
          ) : (
            <div className="w-full text-center py-12">
              <p className="text-gray-300">
                No preferences found matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 mb-4 flex gap-4">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !user}
            className="px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#005858' }}
          >
            {isSubmitting ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}