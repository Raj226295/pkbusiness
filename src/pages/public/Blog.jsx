import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Loader from '../../components/common/Loader.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDate } from '../../lib/formatters.js'

function Blog() {
  const [blogs, setBlogs] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/api/blogs')
      .then(({ data }) => {
        setBlogs(data.blogs)
      })
      .catch((err) => {
        setError(extractApiError(err))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return (
    <div className="page-stack container">
      <section className="page-hero">
        <span className="eyebrow">Knowledge Hub</span>
        <h1>Updates, guidance, and explainers for tax and compliance decisions.</h1>
        <p>Fresh articles from our team on returns, GST, audits, accounting hygiene, and business setup.</p>
      </section>

      {loading ? <Loader message="Loading blogs..." /> : null}
      {error ? <p className="form-message error">{error}</p> : null}

      {!loading && !blogs.length ? (
        <EmptyState
          title="No blog posts yet"
          description="Add blog posts in MongoDB and they will appear here automatically."
        />
      ) : null}

      <div className="card-grid two-up">
        {blogs.map((post) => (
          <article className="info-card blog-card" key={post._id}>
            <span className="eyebrow">{formatDate(post.publishedAt || post.createdAt)}</span>
            <h3>{post.title}</h3>
            <p>{post.description}</p>
            <Link className="text-link" to={`/blog/${post.slug}`}>
              Read article
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}

export default Blog
