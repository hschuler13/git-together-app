"use client";
import { House } from "lucide-react";
import { createClient } from "../utils/supabase/client";
import { useEffect, useState } from "react";

export default function Settings() {
  const supabase = createClient();
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);


 async function handleDeleteAccount() {
  if (deleteConfirmText !== "DELETE") {
    alert('Please type "DELETE" to confirm account deletion.');
    return;
  }
  if (!session?.user) return;
  
  setDeleting(true);
  
  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession?.access_token) {
      throw new Error('No active session');
    }

    const response = await fetch('/api/delete-account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete account');
    }

    await supabase.auth.signOut();
    
    window.location.href = "/home";
    
  } catch (error) {
    console.error("Error deleting account:", error);
    alert("Failed to delete account. Please contact support.");
    setDeleting(false);
  }
}

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#001E1E' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
          <p className="text-lg text-white">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#001E1E' }}>
        <div className="text-center">
          <div className="rounded-xl p-8 shadow-md inline-block border" style={{ backgroundColor: '#014848', borderColor: '#005858' }}>
            <p className="text-xl text-white mb-4">You need to be logged in to access settings</p>
            <a
              href="/login"
              className="inline-block px-6 py-3 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: '#005858' }}
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#001E1E' }}>
      {/* Header */}
      <div className="border-b shadow-sm" style={{ backgroundColor: '#00312F', borderColor: '#014848' }}>
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
              <p className="text-gray-200">{session.user.email}</p>
            </div>
            <a
              href="/home"
              className="px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: '#005858' }}
            >
              <House></House>
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Preferences Section */}
          <div className="rounded-xl p-6 shadow-md border" style={{ backgroundColor: '#014848', borderColor: '#005858' }}>
            <h2 className="text-xl font-semibold text-white mb-4">Preferences</h2>
            <p className="text-gray-300 mb-4">
              Manage your topic preferences to get better issue recommendations
            </p>
            <a
              href="/preferences"
              className="inline-block px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: '#005858' }}
            >
              Manage Preferences
            </a>
          </div>

          {/* Mentor Section */}
          {<div className="rounded-xl p-6 shadow-md border" style={{ backgroundColor: '#014848', borderColor: '#005858' }}>
            <h2 className="text-xl font-semibold text-white mb-4">Mentor Status</h2>
            <p className="text-gray-300 mb-4">
              Manage your mentor status to appear to mentees
            </p>
            <a
              href="/mentor"
              className="inline-block px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: '#005858' }}
            >
              Manage Mentor Status
            </a>
          </div>}

          {/* Account Section */}
          <div className="rounded-xl p-6 shadow-md border" style={{ backgroundColor: '#014848', borderColor: '#005858' }}>
            <h2 className="text-xl font-semibold text-white mb-4">Account</h2>
            <p className="text-gray-300 mb-4">
              Manage your account settings and data
            </p>
            
            <div className="space-y-4">
              <div className="border-t pt-4" style={{ borderColor: '#00312F' }}>
                <h3 className="text-lg font-medium text-white mb-2">Delete Account</h3>
                <p className="text-sm text-gray-300 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                    style={{ backgroundColor: '#8B0000' }}
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="rounded-lg p-4" style={{ backgroundColor: '#00312F' }}>
                    <p className="text-white font-medium mb-3">
                      Are you sure? This action is permanent.
                    </p>
                    <p className="text-sm text-gray-300 mb-3">
                      Type <span className="font-mono font-bold text-white">DELETE</span> to confirm:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg mb-4 bg-white text-gray-900 focus:outline-none focus:ring-2"
                      style={{ focusRingColor: '#005858' }}
                      placeholder="Type DELETE"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleting || deleteConfirmText !== "DELETE"}
                        className="px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: '#8B0000' }}
                      >
                        {deleting ? "Deleting..." : "Confirm Delete"}
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                        }}
                        disabled={deleting}
                        className="px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                        style={{ backgroundColor: '#00312F' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}