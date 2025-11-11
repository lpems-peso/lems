const createAuthUser = async (userEmail: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.value,
          role: 'trainer'
        }
      })
  
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error creating auth user:', error)
      return { success: false, error }
    }
  }