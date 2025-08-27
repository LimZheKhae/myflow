'use client'

import React from 'react'

interface InlineLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const InlineLoader: React.FC<InlineLoaderProps> = ({ 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  }

  return (
    <div className={`inline-block ${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  )
}

export default InlineLoader
