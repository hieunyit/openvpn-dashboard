
"use client"

import * as React from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { Skeleton } from './ui/skeleton';

// Dynamically import ReactQuill to prevent SSR issues
const ReactQuill = dynamic(
  () => import('react-quill'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full rounded-md" />,
  }
);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{'color': []}, {'background': []}],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'direction': 'rtl' }],
    [{ 'align': [] }],
    ['link', 'image', 'video'],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet', 'script', 'indent', 'direction', 'align',
  'link', 'image', 'video'
];

export function RichTextEditor({ value, onChange, readOnly = false }: RichTextEditorProps) {
  return (
    <div className="bg-background rounded-md border">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        readOnly={readOnly}
        className="[&_.ql-editor]:min-h-[300px]"
      />
    </div>
  );
}
