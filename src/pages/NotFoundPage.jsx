import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="page" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:80, marginBottom:12}}>🔍</div>
        <h1 style={{fontSize:48, fontWeight:700, color:'#e07b4f', marginBottom:8}}>404</h1>
        <h2 style={{fontSize:22, fontWeight:600, marginBottom:12}}>Page Not Found</h2>
        <p style={{color:'#888', fontSize:15, marginBottom:24, maxWidth:400}}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn btn-primary">
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
