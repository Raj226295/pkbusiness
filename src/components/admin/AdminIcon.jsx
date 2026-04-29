const iconMap = {
  overview: () => (
    <>
      <rect height="7" rx="2.5" width="7" x="3" y="3" />
      <rect height="7" rx="2.5" width="11" x="10" y="3" />
      <rect height="11" rx="2.5" width="7" x="3" y="10" />
      <rect height="11" rx="2.5" width="11" x="10" y="10" />
    </>
  ),
  message: () => (
    <>
      <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6A2.5 2.5 0 0 1 16.5 16H10l-4 3v-3H7.5A2.5 2.5 0 0 1 5 13.5z" />
      <path d="m8.5 9.5 3.5 2.5 3.5-2.5" />
    </>
  ),
  folder: () => (
    <>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H9l1.5 2h8A2.5 2.5 0 0 1 21 10.5v6A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
    </>
  ),
  appointment: () => (
    <>
      <rect height="15" rx="3" width="16" x="4" y="5" />
      <path d="M8 3v4M16 3v4M4 10h16" />
      <path d="m10 14 2 2 4-4" />
    </>
  ),
  profile: () => (
    <>
      <path d="M12 12a3.75 3.75 0 1 0 0-7.5A3.75 3.75 0 0 0 12 12Z" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </>
  ),
  services: () => (
    <>
      <path d="M5 8.5h14" />
      <path d="M8 5v3.5m8-3.5v3.5" />
      <path d="M6 8.5h12l-1 10.5H7z" />
    </>
  ),
  logout: () => (
    <>
      <path d="M10 6V4.75A1.75 1.75 0 0 1 11.75 3h6.5A1.75 1.75 0 0 1 20 4.75v14.5A1.75 1.75 0 0 1 18.25 21h-6.5A1.75 1.75 0 0 1 10 19.25V18" />
      <path d="m14 12H4" />
      <path d="m7.5 8.5-3.5 3.5 3.5 3.5" />
    </>
  ),
  users: () => (
    <>
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M17 12.5a2.5 2.5 0 1 0 0-5" />
      <path d="M4.5 18a4.5 4.5 0 0 1 9 0" />
      <path d="M15 18a3.5 3.5 0 0 1 5 0" />
    </>
  ),
  bell: () => (
    <>
      <path d="M6 10a6 6 0 1 1 12 0c0 2.9 1.6 4.8 2 5.5H4c.4-.7 2-2.6 2-5.5Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </>
  ),
  preview: () => (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.75" />
    </>
  ),
  block: () => (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 15.5 7-7" />
    </>
  ),
  delete: () => (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V5.75A1.75 1.75 0 0 1 10.75 4h2.5A1.75 1.75 0 0 1 15 5.75V7" />
      <path d="m7 7 1 12h8l1-12" />
      <path d="M10 10.5v5M14 10.5v5" />
    </>
  ),
  payment: () => (
    <>
      <rect height="13" rx="3" width="18" x="3" y="6" />
      <path d="M3 10h18" />
      <path d="M7.5 15.5h3" />
    </>
  ),
  document: () => (
    <>
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" />
      <path d="M14 3.5V8h4" />
      <path d="M8.5 12h7M8.5 15h7" />
    </>
  ),
  download: () => (
    <>
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M5 18h14" />
    </>
  ),
  note: () => (
    <>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v13A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5z" />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" />
    </>
  ),
  search: () => (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  close: () => (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  reply: () => (
    <>
      <path d="M9 7H5.75A1.75 1.75 0 0 0 4 8.75v8.5A1.75 1.75 0 0 0 5.75 19H16" />
      <path d="m12 6 6 6-6 6" />
      <path d="M18 12H8" />
    </>
  ),
  phone: () => (
    <>
      <path d="M7.5 4.5c.5-.5 1.3-.5 1.8 0l1.8 1.8c.5.5.5 1.3 0 1.8l-1.2 1.2a13 13 0 0 0 4.6 4.6l1.2-1.2c.5-.5 1.3-.5 1.8 0l1.8 1.8c.5.5.5 1.3 0 1.8l-1 1c-.9.9-2.3 1.2-3.5.7a19.8 19.8 0 0 1-10-10c-.5-1.2-.2-2.6.7-3.5z" />
    </>
  ),
  email: () => (
    <>
      <rect height="13" rx="2.5" width="18" x="3" y="5.5" />
      <path d="m5.5 8 6.5 4.5L18.5 8" />
    </>
  ),
  company: () => (
    <>
      <path d="M4 20V6.5A1.5 1.5 0 0 1 5.5 5h7A1.5 1.5 0 0 1 14 6.5V20" />
      <path d="M14 20v-9.5A1.5 1.5 0 0 1 15.5 9H18a2 2 0 0 1 2 2V20" />
      <path d="M7.5 8.5h3M7.5 12h3M7.5 15.5h3" />
    </>
  ),
  clock: () => (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3 2" />
    </>
  ),
}

function AdminIcon({ name = 'overview', className = '', size = 18, strokeWidth = 1.8 }) {
  const shape = iconMap[name] || iconMap.overview

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {shape()}
    </svg>
  )
}

export default AdminIcon
