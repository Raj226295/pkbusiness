import { Link } from 'react-router-dom'
import aboutFounder from '../../assets/about-founder.jpg'
import aboutBrandPoster from '../../assets/about-brand-poster.jpg'
import {
  aboutFounderProfile,
  aboutMissionVision,
  aboutServicesOverview,
  aboutStats,
  aboutWhyChooseUs,
  siteBrand,
  testimonials,
} from '../../data/siteData.js'

function About() {
  return (
    <div className="page-stack container about-page">
      <section className="split-section align-start about-section">
        <div className="page-hero about-hero-copy">
          <span className="eyebrow">About {siteBrand.shortName}</span>
          <h1>Professional tax, compliance, and financial guidance built on clarity and trust.</h1>
          <p>
            {siteBrand.name} is a professional tax and compliance firm providing expert support in
            taxation, auditing, registrations, and financial consulting for individuals and
            growing businesses.
          </p>
          <p>
            Our mission is to deliver accurate, reliable, and timely financial solutions that help
            clients stay compliant, make informed decisions, and move forward with confidence.
          </p>
          <div className="about-pill-row">
            <span className="about-pill">Taxation</span>
            <span className="about-pill">Auditing</span>
            <span className="about-pill">GST Services</span>
            <span className="about-pill">Financial Consulting</span>
          </div>
        </div>
        <article className="info-card feature-panel about-profile-card">
          <div className="about-profile-media">
            <img alt={`${siteBrand.name} founder portrait`} src={aboutFounder} />
          </div>
          <div className="about-profile-copy">
            <span className="eyebrow">About the Founder</span>
            <h3>{aboutFounderProfile.name}</h3>
            <p>{aboutFounderProfile.intro}</p>
            <div className="about-founder-grid">
              <div className="about-founder-item">
                <span>Qualification</span>
                <strong>{aboutFounderProfile.qualification}</strong>
              </div>
              <div className="about-founder-item">
                <span>Experience</span>
                <strong>{aboutFounderProfile.experience}</strong>
              </div>
              <div className="about-founder-item about-founder-item-wide">
                <span>Specialization</span>
                <strong>{aboutFounderProfile.specialization}</strong>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="split-section align-start about-section">
        {aboutMissionVision.map((item) => (
          <article className="info-card feature-panel" key={item.label}>
            <span className="eyebrow">{item.label}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      <section className="section-block about-section">
        <div className="section-head compact">
          <div>
            <span className="eyebrow">Our Services</span>
            <h2>Focused support across essential tax and business requirements.</h2>
            <p>
              We offer complete service coverage for day-to-day compliance needs as well as
              important business milestones.
            </p>
          </div>
        </div>

        <div className="card-grid three-up">
          {aboutServicesOverview.map((service) => (
            <article className="info-card" key={service.title}>
              <span className="eyebrow">Service Overview</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block about-section">
        <div className="section-head compact">
          <div>
            <span className="eyebrow">Why Choose Us</span>
            <h2>Professional service designed to feel dependable, efficient, and transparent.</h2>
          </div>
        </div>

        <div className="card-grid three-up">
          {aboutWhyChooseUs.map((item) => (
            <article className="info-card" key={item.title}>
              <span className="eyebrow">Our USP</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block about-section">
        <div className="section-head compact">
          <div>
            <span className="eyebrow">Experience & Trust</span>
            <h2>Numbers that reflect consistency, client confidence, and service depth.</h2>
          </div>
        </div>

        <div className="stats-grid">
          {aboutStats.map((item) => (
            <article className="stat-card" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="split-section align-start about-section">
        <article className="info-card feature-panel about-brand-copy">
          <span className="eyebrow">Trusted Presence</span>
          <h3>Professional support that feels approachable, organized, and dependable.</h3>
          <p>
            We work to combine local accessibility with a polished, professional service
            experience so clients feel confident from the first conversation to final delivery.
          </p>
          <ul className="bullet-list">
            <li>Clear guidance for filings, registrations, and compliance steps.</li>
            <li>Strong communication with timely updates and document support.</li>
            <li>Professional standards with a practical, client-first approach.</li>
          </ul>
        </article>

        <article className="info-card about-brand-visual">
          <div className="about-brand-media">
            <img alt={`${siteBrand.name} business services presentation`} src={aboutBrandPoster} />
          </div>
        </article>
      </section>

      <section className="section-block about-section">
        <div className="section-head compact">
          <div>
            <span className="eyebrow">Client Testimonials</span>
            <h2>Positive feedback from clients who value clarity, responsiveness, and results.</h2>
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

      <section className="cta-banner about-section">
        <div>
          <span className="eyebrow">Get Started Today</span>
          <h2>Contact us for a free consultation and let&apos;s make your next financial step simple and organized.</h2>
        </div>
        <div className="about-cta-actions">
          <Link className="button button-secondary" to="/contact">
            Free Consultation
          </Link>
          <Link className="button button-ghost" to="/services">
            View Services
          </Link>
        </div>
      </section>
    </div>
  )
}

export default About
