import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export function ArchiveIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6.5h16" />
      <path d="M6 6.5v12h12v-12" />
      <path d="M9 10.5h6" />
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

export function ArrowRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 6l6 6-6 6" />
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

export function BookOpenIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.5 6.5h6.5a3 3 0 0 1 3 3v10a2.5 2.5 0 0 0-2.5-2.5h-7z" />
      <path d="M21.5 6.5H15a3 3 0 0 0-3 3v10a2.5 2.5 0 0 1 2.5-2.5h7z" />
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

export function CopyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </IconBase>
  )
}

export function CpuIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4" />
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

export function DownloadSimpleIcon(props: IconProps) {
  return <DownloadIcon {...props} />
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

export function EyeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.8" />
    </IconBase>
  )
}

export function FilePdfIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 3.5h8l4 4v13H6z" />
      <path d="M14 3.5v4h4" />
      <path d="M9 14.5h6M9 17.5h4" />
    </IconBase>
  )
}

export function FileTextIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 3.5h8l4 4v13H6z" />
      <path d="M14 3.5v4h4" />
      <path d="M9 11.5h6M9 15h6M9 18h3.5" />
    </IconBase>
  )
}

export function FilmStripIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M7.5 4.5v15M16.5 4.5v15M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21" />
    </IconBase>
  )
}

export function FlipIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12a8 8 0 0 1 13.8-5.5L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-13.8 5.5L4 15" />
      <path d="M4 20v-5h5" />
    </IconBase>
  )
}

export function GridIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
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

export function ImagesSquareIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6" y="4" width="14" height="14" rx="2" />
      <path d="M4 8v10a2 2 0 0 0 2 2h10" />
      <path d="M9.5 13l2.2-2.2 2.8 2.8 1.6-1.6L18.5 14" />
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

export function MoonIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19.5 14.2A7.5 7.5 0 0 1 9.8 4.5a7.5 7.5 0 1 0 9.7 9.7z" />
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

export function MusicIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 18V6l10-2v12" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="16" r="2" />
    </IconBase>
  )
}

export function PaletteIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17h1.5a2 2 0 0 0 0-4h-.8a1.7 1.7 0 0 1 0-3.4h2.8A5 5 0 0 0 20.5 8.5C20.5 5.6 16.8 3.5 12 3.5z" />
      <circle cx="8" cy="10.5" r=".8" fill="currentColor" />
      <circle cx="11.5" cy="7.5" r=".8" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r=".8" fill="currentColor" />
    </IconBase>
  )
}

export function PauseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
      <rect x="14" y="5" width="3.5" height="14" rx="1" />
    </IconBase>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7.5 5.2l11 6.8-11 6.8z" />
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

export function RefreshIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6L20 8.5" />
      <path d="M20 4v4.5h-4.5" />
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

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </IconBase>
  )
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5l7 3v5.5c0 4.6-3 7.6-7 8.5-4-.9-7-3.9-7-8.5V6.5z" />
      <path d="M9 12.2l2.1 2.1 4-4.2" />
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

export function SunIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
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

export function UserCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="9.4" r="2.8" />
      <path d="M6.8 18.2a6 6 0 0 1 10.4 0" />
    </IconBase>
  )
}

export function VideoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="6" width="12.5" height="12" rx="2" />
      <path d="M16 10l4.5-2.5v9L16 14z" />
    </IconBase>
  )
}

export function VolumeHighIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 9.5h3.5l4.5-4v13l-4.5-4H4.5z" />
      <path d="M16 9a4.2 4.2 0 0 1 0 6" />
      <path d="M18.5 6.5a7.8 7.8 0 0 1 0 11" />
    </IconBase>
  )
}

export function VolumeMuteIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 9.5h3.5l4.5-4v13l-4.5-4H4.5z" />
      <path d="M16.5 9.5l4 5M20.5 9.5l-4 5" />
    </IconBase>
  )
}

export function WandIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 20L15.5 8.5" />
      <path d="M13 6l2.5 2.5" />
      <path d="M18 4l.6 1.8L20.4 6.4l-1.8.6L18 8.8l-.6-1.8-1.8-.6 1.8-.6z" />
    </IconBase>
  )
}

export function WarningCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16.5h.01" />
    </IconBase>
  )
}

export function XIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </IconBase>
  )
}
