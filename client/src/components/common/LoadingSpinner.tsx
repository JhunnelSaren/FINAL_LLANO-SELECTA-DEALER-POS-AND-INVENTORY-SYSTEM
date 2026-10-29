import React from 'react'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function LoadingSpinner({ size = 'md', className = '' }: Props) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6'
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizeClass} animate-spin rounded-full border-2 border-blue-600 border-t-transparent`} />
    </div>
  )
}
