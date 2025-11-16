import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import UploadForm from '../components/UploadForm';

const Upload: React.FC = () => {
  return (
    <DashboardLayout>
      <UploadForm />
    </DashboardLayout>
  );
};

export default Upload;