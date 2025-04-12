'use client';

import React from 'react';

interface SpecialtyCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const SpecialtyCard: React.FC<SpecialtyCardProps> = ({ title, description, icon }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:translate-y-[-5px]">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 flex items-center justify-center rounded-full mr-4" style={{ backgroundColor: '#1F3626' }}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold" style={{ color: '#1F3626' }}>{title}</h3>
      </div>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

export default SpecialtyCard;
