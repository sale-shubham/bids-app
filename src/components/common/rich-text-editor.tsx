'use client';
import * as React from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import 'react-quill-new/dist/quill.snow.css';

// Quill touches `document` at import time, so it can only load client-side —
// same dynamic-import guard the hospital project's editor uses. The snow
// theme's own stylesheet is re-skinned onto this app's tokens in globals.css
// (`.ql-*` block) so it works in dark mode.
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

// Toolbar kept to what legal copy actually needs — headings, emphasis, lists,
// links, alignment. No image/video upload (those would need S3 plumbing).
const MODULES = {
  toolbar: [
    [{ header: [2, 3, 4, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'blockquote'],
    ['clean'],
  ],
};

const FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'list',
  'align',
  'link',
  'blockquote',
];

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      modules={MODULES}
      formats={FORMATS}
      placeholder={placeholder}
    />
  );
}
