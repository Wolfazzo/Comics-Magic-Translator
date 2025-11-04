import React from 'react';
import { useTranslation } from '../services/i18n';

interface FileWithUrl {
  file: File;
  url: string;
}

interface FilePanelProps {
  files: FileWithUrl[];
  selectedFile: File | null;
  onFilesChange: (files: FileList) => void;
  onFileSelect: (file: File) => void;
  onFileDelete: (file: File) => void;
  onSaveProject: () => void;
  onLoadProject: (files: FileList) => void;
  onAddImage: (file: File) => void;
}

const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);


const FilePanel: React.FC<FilePanelProps> = ({ files, selectedFile, onFilesChange, onFileSelect, onFileDelete, onSaveProject, onLoadProject, onAddImage }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const projectInputRef = React.useRef<HTMLInputElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesChange(e.target.files);
    }
  };
  
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddImage(e.target.files[0]);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleAddImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleLoadClick = () => {
      projectInputRef.current?.click();
  };

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          onLoadProject(e.target.files);
          // Reset the input so the same file can be loaded again
          if (e.target) e.target.value = '';
      }
  };
  
  return (
    <div className="h-full bg-gray-800 p-4 flex flex-col overflow-hidden">
      <input
        type="file"
        multiple
        accept="image/png, image/jpeg, image/webp"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
       <input
        type="file"
        accept="image/png, image/jpeg, image/webp"
        ref={imageInputRef}
        onChange={handleImageFileChange}
        className="hidden"
      />
      <input
          type="file"
          accept=".zip"
          ref={projectInputRef}
          onChange={handleProjectFileChange}
          className="hidden"
      />
      <div className="grid grid-cols-2 gap-2 flex-shrink-0">
        <button
            onClick={handleUploadClick}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
        >
            {t('uploadPages')}
        </button>
        <button
            onClick={handleAddImageClick}
            disabled={!selectedFile}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
            {t('addImage')}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2 mb-4 flex-shrink-0">
          <button
              onClick={onSaveProject}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-lg transition-colors duration-200 text-sm"
          >
              {t('saveProject')}
          </button>
          <button
              onClick={handleLoadClick}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-lg transition-colors duration-200 text-sm"
          >
              {t('loadProject')}
          </button>
      </div>
      <div className="flex-grow space-y-2 overflow-y-auto">
        {files.length > 0 ? (
          files.map(({ file, url }) => (
            <div
              key={file.name}
              onClick={() => onFileSelect(file)}
              className={`relative group flex items-center p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                selectedFile?.name === file.name ? 'bg-indigo-700' : 'hover:bg-gray-700'
              }`}
            >
              <img src={url} alt={file.name} className="w-16 h-16 object-cover rounded-md mr-3" />
              <span className="text-sm font-medium truncate">{file.name}</span>
               <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent onFileSelect from firing
                  onFileDelete(file);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-gray-800 bg-opacity-50 text-gray-300 hover:bg-red-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                aria-label={t('deleteFile', { fileName: file.name })}
                title={t('deleteFile', { fileName: file.name })}
              >
                <TrashIcon />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 mt-8">
            <p>{t('uploadPrompt')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePanel;