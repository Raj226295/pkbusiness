import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid container">
        <div>
          <span className="eyebrow">Trusted CA Partner</span>
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
            <span>3rd Floor, Civil Lines, New Delhi</span>
            <a href="tel:+919999999999">+91 99999 99999</a>
            <a href="mailto:hello@svca.in">hello@svca.in</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom container">
        <span>&copy; {new Date().getFullYear()} Singh Verma & Associates. All rights reserved.</span>
      </div>
    </footer>
  )
}

export default Footer
