'use client'

import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

type FileDropzoneProps = {
  accept: string
  label: string
  hint?: string
  multiple?: boolean
  disabled?: boolean
  compact?: boolean
  onFiles: (files: File[]) => void
}

function acceptsFile(file: File, accept: string) {
  const rules = accept.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
  if (rules.length === 0) return true

  return rules.some((rule) => {
    if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule)
    if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1))
    return file.type.toLowerCase() === rule
  })
}

export function FileDropzone({
  accept,
  label,
  hint = 'فایل را اینجا رها کنید یا برای انتخاب کلیک کنید',
  multiple = false,
  disabled = false,
  compact = false,
  onFiles,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const submitFiles = (list: FileList | File[]) => {
    if (disabled) return
    const files = Array.from(list).filter((file) => acceptsFile(file, accept))
    if (files.length === 0) return
    onFiles(multiple ? files : files.slice(0, 1))
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault()
        if (!disabled) setDragActive(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) {
          event.dataTransfer.dropEffect = 'copy'
          setDragActive(true)
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragActive(false)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragActive(false)
        submitFiles(event.dataTransfer.files)
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-all outline-none',
        compact ? 'gap-2 p-4' : 'gap-3 p-8 sm:p-10',
        dragActive
          ? 'scale-[1.01] border-primary bg-primary/10 shadow-sm'
          : 'border-border bg-secondary/40 hover:border-primary/50 hover:bg-primary/5',
        disabled && 'pointer-events-none cursor-not-allowed opacity-50',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) submitFiles(event.target.files)
          event.currentTarget.value = ''
        }}
      />
      <UploadCloud className={cn('text-primary transition-transform', compact ? 'size-5' : 'size-8', dragActive && '-translate-y-0.5')} />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{dragActive ? 'فایل را رها کنید' : hint}</p>
      </div>
    </div>
  )
}
