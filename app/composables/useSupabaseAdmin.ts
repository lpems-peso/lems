export const useSupabaseAdmin = () => {
    const config = useRuntimeConfig()
    
    const supabaseAdmin = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceKey
    )
    
    return supabaseAdmin
  }

function createClient(supabaseUrl: unknown, supabaseServiceKey: unknown) {
    throw new Error("Function not implemented.")
}
