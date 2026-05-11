import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  )
}

export function ArchiveIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6.5h16" />
      <path d="M6 6.5v12h12v-12" />
      <path d="M9 10h6" />
    </IconBase>
  )
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 18l-6-6 6-6" />
    </IconBase>
  )
}

export function BookIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 4.5h8a3 3 0 0 1 3 3v12H8a3 3 0 0 0-3 3z" />
      <path d="M16 7.5h3v12h-3" />
      <path d="M8.5 8.5h4" />
      <path d="M8.5 12h3" />
    </IconBase>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12.5l4 4L19 6" />
    </IconBase>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M5 20h14" />
    </IconBase>
  )
}

export function EditIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="M14 7l3 3" />
    </IconBase>
  )
}

export function ExportIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 15V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M5 13v6h14v-6" />
    </IconBase>
  )
}

export function ImageIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 13l2-2 3 3 2-2 3 3" />
      <path d="M8.5 9h.01" />
    </IconBase>
  )
}

export function MoreIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 12h.01" />
      <path d="M12 12h.01" />
      <path d="M18 12h.01" />
    </IconBase>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </IconBase>
  )
}

export function MusicIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 18V6l10-2v12" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="16" r="2" />
    </IconBase>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  )
}

export function SaveIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 5h11l3 3v11H5z" />
      <path d="M8 5v5h7V5" />
      <path d="M8 19v-5h8v5" />
    </IconBase>
  )
}

export function SparkleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
    </IconBase>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M7 7l1 13h8l1-13" />
    </IconBase>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 15V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M5 17.5h14" />
    </IconBase>
  )
}
