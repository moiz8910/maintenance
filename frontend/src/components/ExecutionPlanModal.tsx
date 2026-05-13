'use client';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { WorkOrderDetailView } from './WorkOrderDetailView';

interface ExecutionPlanModalProps {
  workOrderId: string;
  onClose: () => void;
}

const ExecutionPlanModal: React.FC<ExecutionPlanModalProps> = ({ workOrderId, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent scrolling on background when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!mounted) return null;

  // Use a portal to render the modal at the top level of the DOM
  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8"
      onClick={(e) => {
        // Close modal if clicking on the backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <WorkOrderDetailView workOrderId={workOrderId} onClose={onClose} isFullPage={false} />
    </div>,
    document.body
  );
};

export default ExecutionPlanModal;
