import { Link } from 'react-router-dom'
import homeHeroProfile from '../../assets/home-hero-profile.jpg'
import { serviceCatalog, testimonials } from '../../data/siteData.js'

function Home() {
  return (
    <div className="page-stack">
      <section className="hero-section home-hero-section container">
        <div className="hero-copy home-hero-copy">
          <span className="eyebrow">Professional business support</span>
          <h1>Tax, GST, and registration guidance presented with clarity, speed, and trust.</h1>
          <p>
            We help professionals, families, and growing businesses handle tax filing,
            registrations, and ongoing compliance with a more organized and dependable process.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/contact">
              Book Consultation
            </Link>
            <Link className="button button-ghost" to="/services">
              Explore Services
            </Link>
          </div>
          <div className="hero-service-strip">
            <span>ITR Filing</span>
            <span>GST Registration</span>
            <span>Udyam Support</span>
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

        <div className="home-hero-visual">
          <div className="home-hero-figure">
            <img alt="PK Business professional reviewing business documents" src={homeHeroProfile} />
          </div>
          <div className="home-hero-caption">
            <strong>Purnia & Beyond</strong>
            <span>Reliable assistance for filings, registrations, and document-ready compliance work.</span>
          </div>
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
