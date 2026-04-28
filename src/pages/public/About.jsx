import aboutPortrait from '../../assets/about-portrait.png'
import { aboutHighlights, siteBrand } from '../../data/siteData.js'

function About() {
  return (
    <div className="page-stack container">
      <section className="split-section">
        <div>
          <span className="eyebrow">About the Firm</span>
          <h1>Dedicated compliance advice with practical business context.</h1>
          <p>
            {siteBrand.name} supports businesses and individuals across tax filing, GST, company
            law, audits, and bookkeeping. We focus on fast response times, accurate filings, and
            clear explanations that help clients make confident decisions.
          </p>
        </div>
        <article className="info-card feature-panel about-profile-card">
          <div className="about-profile-media">
            <img alt={`${siteBrand.name} advisor portrait`} src={aboutPortrait} />
          </div>
          <div className="about-profile-copy">
            <h3>CA Profile</h3>
            <ul className="bullet-list">
              {aboutHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      <section className="card-grid two-up">
        <article className="info-card">
          <span className="eyebrow">Mission</span>
          <h3>Make compliance calmer and more predictable for every client.</h3>
          <p>
            We combine strong technical knowledge with a service model that keeps clients informed,
            prepared, and deadline-ready.
          </p>
        </article>

        <article className="info-card">
          <span className="eyebrow">Vision</span>
          <h3>Become the long-term finance and compliance partner for ambitious businesses.</h3>
          <p>
            Our goal is to simplify financial operations so founders can focus on growth while their
            statutory work remains under control.
          </p>
        </article>
      </section>
    </div>
  )
}

export default About
