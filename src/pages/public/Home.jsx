import { Link } from 'react-router-dom'
import { serviceCatalog, testimonials } from '../../data/siteData.js'

function Home() {
  return (
    <div className="page-stack">
      <section className="hero-section container">
        <div className="hero-copy">
          <span className="eyebrow">End-to-end CA advisory</span>
          <h1>Tax, compliance, and finance operations that keep your business moving.</h1>
          <p>
            We help startups, professionals, and families manage income tax, GST, audit, company
            registration, and books with clarity and speed.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/contact">
              Book Consultation
            </Link>
            <Link className="button button-ghost" to="/services">
              Explore Services
            </Link>
          </div>
          <div className="hero-stats">
            <div>
              <strong>1,200+</strong>
              <span>Returns filed</span>
            </div>
            <div>
              <strong>98%</strong>
              <span>Deadline adherence</span>
            </div>
            <div>
              <strong>12 Years</strong>
              <span>Practice experience</span>
            </div>
          </div>
        </div>

        <div className="hero-panel">
          <span className="panel-chip">CA dashboard ready</span>
          <h3>One portal for documents, appointments, invoices, and service updates.</h3>
          <ul className="bullet-list">
            <li>Secure document uploads for ITR, GST, and audit work</li>
            <li>Live status tracking for ongoing assignments</li>
            <li>Consultation booking and payment visibility in one place</li>
          </ul>
        </div>
      </section>

      <section className="container section-block">
        <div className="section-head compact">
          <div>
            <span className="eyebrow">Core Services</span>
            <h2>Built for individuals, founders, and finance teams.</h2>
          </div>
          <Link className="text-link" to="/services">
            View all services
          </Link>
        </div>

        <div className="card-grid three-up">
          {serviceCatalog.slice(0, 3).map((service) => (
            <article className="info-card" key={service.title}>
              <h3>{service.title}</h3>
              <p>{service.summary}</p>
              <ul className="bullet-list">
                {service.deliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="container section-block">
        <div className="cta-banner">
          <div>
            <span className="eyebrow">Need expert guidance?</span>
            <h2>Book a consultation and get a practical action plan for your next compliance step.</h2>
          </div>
          <Link className="button button-secondary" to="/contact">
            Book Consultation
          </Link>
        </div>
      </section>

      <section className="container section-block">
        <div className="section-head compact">
          <div>
            <span className="eyebrow">Client Feedback</span>
            <h2>Trusted by growing businesses and busy professionals.</h2>
          </div>
        </div>

        <div className="card-grid three-up">
          {testimonials.map((testimonial) => (
            <article className="testimonial-card" key={testimonial.name}>
              <p>"{testimonial.quote}"</p>
              <strong>{testimonial.name}</strong>
              <span>{testimonial.company}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home
