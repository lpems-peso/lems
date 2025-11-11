// utils/helpers.ts
export const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return 'Invalid Date'
    }
  }
  
  export const getUserInitials = (fullName: string | null): string => {
    if (!fullName) return 'U'
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  export const getRoleBadgeClass = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800'
      case 'trainer':
        return 'bg-blue-100 text-blue-800'
      case 'trainee':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  export const handleSupabaseError = (error: any): string => {
    if (error.code === '23505') return 'User with this email already exists'
    if (error.code === '42501') return 'Permission denied'
    return error.message || 'An unexpected error occurred'
  }