export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'trainer' | 'trainee'
          full_name: string | null
          created_at: string
          updated_at: string
          program: string
          other_program:string
        }
        Insert: {
          id: string
          email: string
          role: 'admin' | 'trainer' | 'trainee'
          full_name?: string | null
          created_at?: string
          updated_at?: string
          program: string
          other_program:string
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'trainer' | 'trainee'
          full_name?: string | null
          created_at?: string
          updated_at?: string
          program: string
          other_program:string
        }
      }
      archive_users: {  
            Row: {
            id: string
            email: string
            role: 'admin' | 'trainer' | 'trainee'
            full_name: string | null
            created_at: string
            archivec_at: string
            program: string
            other_program:string
          }
          Insert: {
            id: string
            email: string
            role: 'admin' | 'trainer' | 'trainee'
            full_name?: string | null
            created_at?: string
            archivec_at: string
            program: string
            other_program:string
          }
          Update: {
            id?: string
            email?: string
            role?: 'admin' | 'trainer' | 'trainee'
            full_name?: string | null
            created_at?: string
            archivec_at: string
            program: string
            other_program:string
          }
        }
      }
  }
}