import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import SearchInterface from '../components/SearchInterface';

const Search: React.FC = () => {
  return (
    <DashboardLayout>
      <SearchInterface />
    </DashboardLayout>
  );
};

export default Search;