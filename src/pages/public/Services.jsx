import { Link } from 'react-router-dom'
import { serviceCatalog } from '../../data/siteData.js'

function Services() {
  return (
    <div className="page-stack container">
      <section className="page-hero">
        <span className="eyebrow">What We Do</span>
        <h1>Chartered accountant services designed around timelines, documentation, and outcomes.</h1>
        <p>
          Whether you need a one-time filing or a long-term compliance partner, we tailor the
          process to your business stage and reporting needs.
        </p>
      </section>

      <section className="card-grid three-up">
        {serviceCatalog.map((service) => (
          <article className="info-card service-card" key={service.title}>
            <h3>{service.title}</h3>
            <p>{service.summary}</p>
            <ul className="bullet-list">
              {service.deliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="cta-banner">
        <div>
          <span className="eyebrow">Ready to start?</span>
          <h2>Share your requirement and we’ll recommend the right service package.</h2>
        </div>
        <Link className="button button-secondary" to="/contact">
          Talk to an Expert
        </Link>
      </section>
    </div>
  )
}

export default Services
