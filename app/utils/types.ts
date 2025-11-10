interface UserData {
  id: string
  auth_id: string
  email: string
  role: 'admin' | 'trainer' | 'user' | 'trainee'
  full_name: string | null
  status: string | null
  created_at: string
  updated_at: string
}
