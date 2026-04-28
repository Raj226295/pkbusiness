import { useState } from 'react'
import { siteContact } from '../../data/siteData.js'
import api, { extractApiError } from '../../lib/api.js'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  message: '',
}

function Contact() {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      await api.post('/api/contact', form)
      setForm(initialForm)
      setStatus({ type: 'success', message: 'Your message has been sent. We will contact you soon.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-stack container">
      <section className="page-hero">
        <span className="eyebrow">Contact Us</span>
        <h1>Let’s discuss your compliance, tax, or finance requirement.</h1>
        <p>Send your details, or use the WhatsApp button for a quick consultation request.</p>
      </section>

      <section className="split-section align-start">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h3>Request a callback</h3>
          <div className="form-grid">
            <label>
              Name
              <input name="name" onChange={handleChange} required type="text" value={form.name} />
            </label>
            <label>
              Email
              <input name="email" onChange={handleChange} required type="email" value={form.email} />
            </label>
            <label>
              Phone
              <input name="phone" onChange={handleChange} required type="tel" value={form.phone} />
            </label>
            <label className="full-width">
              Message
              <textarea
                name="message"
                onChange={handleChange}
                required
                rows="5"
                value={form.message}
              />
            </label>
          </div>

          {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? 'Sending...' : 'Send Inquiry'}
          </button>
        </form>

        <div className="contact-stack">
          <article className="panel">
            <h3>Visit our office</h3>
            <p>{siteContact.address}</p>
            <p>Mon - Sat | 10:00 AM to 7:00 PM</p>
            <a className="text-link" href="mailto:hello@svca.in">
              hello@svca.in
            </a>
          </article>

          <article className="panel map-panel">
            <iframe
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(siteContact.mapQuery)}&z=15&output=embed`}
              title="Office map"
            />
          </article>
        </div>
      </section>
    </div>
  )
}

export default Contact
