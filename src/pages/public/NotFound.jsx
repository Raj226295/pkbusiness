import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <section className="auth-shell container">
      <div className="panel auth-card">
        <span className="eyebrow">404</span>
        <h1>Page not found</h1>
        <p>The page you requested doesn’t exist or may have moved.</p>
        <Link className="button button-primary" to="/">
          Return home
        </Link>
      </div>
    </section>
  )
}

export default NotFound
