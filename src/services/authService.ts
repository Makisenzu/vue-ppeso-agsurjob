import { supabase } from "@/lib/supabaseClient"
import type { SignInWithPasswordCredentials } from '@supabase/supabase-js'

export const authService = {
  async login(credentials: SignInWithPasswordCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword(credentials)
    if (error) throw error
    return data
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async checkEmailExists(email: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_if_email_exists', {
      target_email: email.trim()
    })
    if (error) {
      throw new Error(error.message)
    }
    return !!data
}
}