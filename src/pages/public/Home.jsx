import { Link } from 'react-router-dom'
import homeHeroPoster from '../../assets/home-hero-poster.jpg'
import { serviceCatalog, testimonials } from '../../data/siteData.js'

function Home() {
  return (
    <div className="page-stack">
      <section className="hero-section home-hero-section container">
        <div className="hero-copy home-hero-copy">
          <span className="eyebrow">Trusted business partner</span>
          <h1>ITR, GST, and business compliance support that keeps you one step ahead.</h1>
          <p>
            We help professionals, families, shop owners, and growing businesses manage tax filing,
            registrations, and routine compliance with clarity, speed, and personal attention.
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

        <div className="hero-panel home-hero-panel">
          <div className="home-hero-media">
            <img alt="PK Business service poster" src={homeHeroPoster} />
          </div>
          <span className="panel-chip">Purnia & Beyond</span>
          <h3>Practical support for tax filing, GST registration, and Udyam documentation.</h3>
          <p>
            Clear advice, organized paperwork, and dependable follow-through for clients who want a
            smoother compliance experience.
          </p>
          <ul className="bullet-list">
            <li>Dedicated support for ITR filing, GST work, and Udyam registration</li>
            <li>Simple document collection with fast coordination on active tasks</li>
            <li>Consultation and follow-up support that stays easy to understand</li>
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
