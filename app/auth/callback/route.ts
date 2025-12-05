import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const cookieStore = cookies() 
  
  const redirectToLogin = (errorParam: string) => 
    NextResponse.redirect(new URL(`/login?error=${errorParam}`, requestUrl.origin))
  
  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async getAll() { return (await cookieStore).getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(async ({ name, value, options }) =>
              (await cookieStore).set(name, value, options)
            )
          },
        },
      }
    )
    
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Error exchanging code for session:', sessionError)
      return redirectToLogin('auth_failed')
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Error getting user after sign-in:', userError)
      return redirectToLogin('user_fetch_failed')
    }
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, preferences, mentor_status')
        .eq('id', user.id)
        .single()
      
      if (!profile?.username) {
        let defaultUsername: string | null = null;
        const githubUsername = user.user_metadata?.user_name as string | undefined;
        
        if (githubUsername) {
          defaultUsername = githubUsername;
        } else if (user.email) {
          defaultUsername = user.email.split('@')[0];
        } else {
          // Final fallback
          defaultUsername = `user_${user.id.substring(0, 8)}`;
        }
        
        // Ensure we have a username before attempting to update
        if (defaultUsername) {
          console.log(`Username is missing. Setting default username: ${defaultUsername}`);
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ username: defaultUsername })
            .eq('id', user.id)
          
          if (updateError) {
            console.error('Error updating profile username:', updateError)
          }
          
          return NextResponse.redirect(new URL('/profile-setup', requestUrl.origin))
        }
        // --- END FIX ---
      }
      
      if (profile?.preferences === null) {
        return NextResponse.redirect(new URL('/preferences', requestUrl.origin))
      }
      
      if (profile?.mentor_status === null) {
        return NextResponse.redirect(new URL('/mentor', requestUrl.origin))
      }
    }
  }
  
  return NextResponse.redirect(new URL('/home', requestUrl.origin))
}