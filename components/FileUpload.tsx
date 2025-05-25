
import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Fix: Changed event type to be compatible with both label and div
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);
    setFileName(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidFile(file)) {
        setFileName(file.name);
        onFileUpload(file);
      } else {
        setError('Ungültiger Dateityp. Bitte laden Sie eine .csv oder .xlsx Datei hoch.');
      }
    }
  }, [onFileUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError(null);
    setFileName(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isValidFile(file)) {
        setFileName(file.name);
        onFileUpload(file);
      } else {
        setError('Ungültiger Dateityp. Bitte laden Sie eine .csv oder .xlsx Datei hoch.');
      }
    }
  };
  
  const isValidFile = (file: File): boolean => {
    return file.type === 'text/csv' || 
           file.name.endsWith('.csv') || 
           file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
           file.name.endsWith('.xlsx');
  };

  return (
    <div className="w-full flex flex-col items-center">
      <label
        htmlFor="file-upload-input"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`w-full max-w-lg p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out
                    ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-secondary-300 hover:border-primary-400'}`}
      >
        <input
          id="file-upload-input"
          type="file"
          className="hidden"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          onChange={handleChange}
        />
        <div className="flex flex-col items-center justify-center text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-16 h-16 mb-4 ${dragActive ? 'text-primary-600' : 'text-secondary-400'}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
          </svg>
          <p className={`text-lg font-medium ${dragActive ? 'text-primary-700' : 'text-secondary-600'}`}>
            Datei hierher ziehen oder klicken, um hochzuladen
          </p>
          <p className="text-sm text-secondary-500 mt-1">(.xlsx oder .csv)</p>
          {fileName && <p className="text-sm text-green-600 mt-2">Ausgewählt: {fileName}</p>}
        </div>
      </label>
      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      <div 
        onDragEnter={handleDrag} 
        onDragLeave={handleDrag} 
        onDragOver={handleDrag} 
        onDrop={handleDrop} 
        className={`${dragActive ? 'fixed inset-0 z-50 bg-black/30' : 'hidden'}`}
      />
    </div>
  );
};
