import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#fbf9f6',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>🌳</div>
      <div style={{ fontSize: 20, color: '#2d322f', fontFamily: "'Noto Serif SC', serif" }}>
        页面不存在
      </div>
      <Link
        href="/"
        style={{
          fontSize: 14,
          color: '#a46355',
          fontFamily: 'sans-serif',
          textDecoration: 'none',
        }}
      >
        回到首页 →
      </Link>
    </main>
  )
}
