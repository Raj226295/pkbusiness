import { Link } from 'react-router-dom'
import aboutFounder from '../../assets/about-founder.jpg'
import {
  aboutHighlights,
  aboutPillars,
  aboutSupportAreas,
  aboutWorkStyle,
  siteBrand,
} from '../../data/siteData.js'

function About() {
  return (
    <div className="page-stack container">
      <section className="split-section align-start">
        <div className="page-hero about-hero-copy">
          <span className="eyebrow">About {siteBrand.shortName}</span>
          <h1>Business compliance support that feels personal, clear, and dependable.</h1>
          <p>
            {siteBrand.name} helps individuals, professionals, and local businesses manage tax,
            registration, and routine compliance work without unnecessary confusion.
          </p>
          <p>
            From ITR filing to GST and business registrations, our focus is simple: clear advice,
            timely action, and a smoother experience from first document to final submission.
          </p>
          <div className="about-pill-row">
            <span className="about-pill">ITR Filing</span>
            <span className="about-pill">GST Support</span>
            <span className="about-pill">Udyam Registration</span>
            <span className="about-pill">Business Guidance</span>
          </div>
        </div>
        <article className="info-card feature-panel about-profile-card">
          <div className="about-profile-media">
            <img alt={`${siteBrand.name} founder portrait`} src={aboutFounder} />
          </div>
          <div className="about-profile-copy">
            <h3>Professional support with a friendly local approach.</h3>
            <p>
              We believe compliance services should feel approachable, organized, and genuinely
              helpful for every client.
            </p>
            <ul className="bullet-list">
              {aboutHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      <section className="card-grid three-up">
        {aboutPillars.map((pillar) => (
          <article className="info-card" key={pillar.title}>
            <span className="eyebrow">Why Us</span>
            <h3>{pillar.title}</h3>
            <p>{pillar.description}</p>
          </article>
        ))}
      </section>

      <section className="split-section align-start">
        <article className="info-card">
          <span className="eyebrow">What We Help With</span>
          <h3>Support designed for both routine filings and growing business needs.</h3>
          <ul className="bullet-list">
            {aboutSupportAreas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="info-card">
          <span className="eyebrow">How We Work</span>
          <h3>A smoother process built around clarity, timelines, and follow-through.</h3>
          <ul className="bullet-list">
            {aboutWorkStyle.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="cta-banner">
        <div>
          <span className="eyebrow">Let&apos;s Work Together</span>
          <h2>Need help with tax filing, GST, or business registration? Let&apos;s make the next step simple.</h2>
        </div>
        <Link className="button button-secondary" to="/contact">
          Contact Us
        </Link>
      </section>
    </div>
  )
}

export default About
