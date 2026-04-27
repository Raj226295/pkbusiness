import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDate } from '../../lib/formatters.js'

function BlogPost() {
  const { slug } = useParams()
  const [blog, setBlog] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get(`/api/blogs/${slug}`)
      .then(({ data }) => {
        setBlog(data.blog)
      })
      .catch((err) => {
        setError(extractApiError(err))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [slug])

  if (loading) {
    return (
      <div className="container page-stack">
        <Loader message="Loading article..." />
      </div>
    )
  }

  if (error || !blog) {
    return (
      <div className="container page-stack">
        <p className="form-message error">{error || 'Blog post not found.'}</p>
        <Link className="text-link" to="/blog">
          Back to blog
        </Link>
      </div>
    )
  }

  return (
    <article className="container page-stack blog-article">
      <Link className="text-link" to="/blog">
        Back to blog
      </Link>
      <span className="eyebrow">{formatDate(blog.publishedAt || blog.createdAt)}</span>
      <h1>{blog.title}</h1>
      <p className="lead-copy">{blog.description}</p>

      <div className="rich-copy">
        {blog.content.split('\n').filter(Boolean).map((paragraph, index) => (
          <p key={`${blog._id}-${index}`}>{paragraph}</p>
        ))}
      </div>
    </article>
  )
}

export default BlogPost
