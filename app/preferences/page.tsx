"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function PreferencesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPreferences, setSelectedPreferences] = useState([]);

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

  function skipHome() {
    router.push("/home");
  }

  return (
    <div className="min-h-screen bg-linear-to-r from-[#001e1e] to-[#014848] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-100">Preferences</h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-50 w-5 h-5" />
          <input
            type="text"
            placeholder="Search preferences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border bg-[#20746e] border-cyan-50 text-cyan-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8afffb] focus:border-transparent"
          />
        </div>

        {searchQuery && (
          <p className="text-sm text-cyan-50 mb-4">
            {filteredPreferences.length} result
            {filteredPreferences.length !== 1 ? "s" : ""} found
          </p>
        )}

        {selectedPreferences.length > 0 && (
          <div className="mt-4 p-4 bg-cyan-100 border border-blue-200 rounded-lg mb-4 ">
            <p className="text-sm text-blue-900">
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
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedPreferences.includes(pref.id)
                    ? "bg-[#01817d] text-white hover:bg-[#00beb8] border border-cyan-50"
                    : "bg-cyan-100 text-[#003a38] border border-[#003a38] hover:bg-[#7cdeda] hover:border-gray-400"
                }`}
              >
                {pref.name}
              </button>
            ))
          ) : (
            <div className="w-full text-center py-12">
              <p className="text-cyan-50">
                No preferences found matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 mb-4">
          <Button className="mr-4 bg-[#016764] border border-cyan-50 text-cyan-50 hover:bg-[#209092] hover:border-[#8afffb]" onClick={skipHome}>
            Skip
          </Button>
          <Button className="mr-4 bg-[#016764] border border-cyan-50 text-cyan-50 hover:bg-[#209092] hover:border-[#8afffb]">Submit</Button>
        </div>
      </div>
    </div>
  );
}
