'use client'

import React from 'react'

interface GeometricLoaderProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const GeometricLoader: React.FC<GeometricLoaderProps> = ({
    size = 'md',
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-11 h-11',
        lg: 'w-16 h-16'
    }

    return (
        <div className="flex items-center justify-center gap-4">
            {/* Circle Loader */}
            <div className={`loader ${sizeClasses[size]} ${className}`}>
                <svg viewBox="0 0 80 80">
                    <circle r="32" cy="40" cx="40" id="test"></circle>
                </svg>
            </div>

            {/* Triangle Loader */}
            <div className={`loader triangle ${sizeClasses[size]} ${className}`}>
                <svg viewBox="0 0 86 80">
                    <polygon points="43 8 79 72 7 72"></polygon>
                </svg>
            </div>

            {/* Rectangle Loader */}
            <div className={`loader ${sizeClasses[size]} ${className}`}>
                <svg viewBox="0 0 80 80">
                    <rect height="64" width="64" y="8" x="8"></rect>
                </svg>
            </div>
        </div>
    )
}

export default GeometricLoader
