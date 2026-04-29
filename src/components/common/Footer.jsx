import { Link } from 'react-router-dom'
import { siteBrand, siteContact, siteSocials } from '../../data/siteData.js'

const socialIcons = [
  {
    label: 'Instagram',
    href: siteSocials.instagram,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.3" cy="6.7" r="1.2" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: siteSocials.facebook,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.2 21v-7.1h2.4l.4-2.8h-2.8V9.3c0-.8.2-1.4 1.4-1.4H16V5.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.6 1.3-3.6 3.8v2H8v2.8h2.2V21z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: siteSocials.youtube,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.1 7.4a2.9 2.9 0 0 0-2.1-2C17.2 5 12 5 12 5s-5.2 0-7 .4a2.9 2.9 0 0 0-2.1 2A30.3 30.3 0 0 0 2.5 12a30.3 30.3 0 0 0 .4 4.6 2.9 2.9 0 0 0 2.1 2C6.8 19 12 19 12 19s5.2 0 7-.4a2.9 2.9 0 0 0 2.1-2 30.3 30.3 0 0 0 .4-4.6 30.3 30.3 0 0 0-.4-4.6M10.3 15.2V8.8l5.5 3.2z" />
      </svg>
    ),
  },
  {
    label: 'Gmail',
    href: siteSocials.gmail,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 6.2h17a1 1 0 0 1 1 1v9.6a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V7.2a1 1 0 0 1 1-1m8.5 6.4L4.6 7.7v8.1h2.1v-4.3l4.8 3.6a.9.9 0 0 0 1 0l4.8-3.6v4.3h2.1V7.7z" />
      </svg>
    ),
  },
]

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid container">
        <div>
          <span className="eyebrow">{siteBrand.name}</span>
          <h3>Practical tax, compliance, and growth guidance for Indian businesses.</h3>
          <p>
            From incorporation to audit readiness, we help founders and families stay compliant and
            confident.
          </p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <div className="footer-links">
            <Link to="/services">Services</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login">Client Login</Link>
          </div>
        </div>

        <div>
          <h4>Office</h4>
          <div className="footer-links">
            <span>{siteContact.address}</span>
            <span>{siteContact.officeHours}</span>
            <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
          </div>

          <div className="footer-socials" aria-label="Social links">
            {socialIcons.map((social) => (
              <a
                key={social.label}
                className="social-link"
                href={social.href}
                target={social.href.startsWith('mailto:') ? undefined : '_blank'}
                rel={social.href.startsWith('mailto:') ? undefined : 'noreferrer'}
                aria-label={social.label}
                title={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom container">
        <span>&copy; {new Date().getFullYear()} {siteBrand.name}. All rights reserved.</span>
      </div>
    </footer>
  )
}

export default Footer
