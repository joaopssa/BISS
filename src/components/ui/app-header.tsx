
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, Brain } from 'lucide-react';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, subtitle }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
          <img 
            src="/lovable-uploads/f77e9c7d-1d78-46ea-9b89-391284783838.png" 
            alt="BISS" 
            className={`w-8 h-8 object-contain ${theme === 'dark' ? 'brightness-0 invert' : ''}`}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{title}</h1>
          {subtitle && (
            <p className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <Brain className="w-4 h-4" />
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Sun className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <Switch
          checked={theme === 'dark'}
          onCheckedChange={toggleTheme}
        />
        <Moon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </div>
    </div>
  );
};
