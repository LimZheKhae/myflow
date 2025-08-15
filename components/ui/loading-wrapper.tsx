import React from 'react';
import Loading from './loading';

interface LoadingWrapperProps {
  className?: string;
}

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({ className = '' }) => {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-background ${className}`}>
      <Loading />
    </div>
  );
};

export default LoadingWrapper; 