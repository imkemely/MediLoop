import { sx } from "../styles";

export default function Footer() {
  return (
    <footer style={sx.footerBar}>
      <div style={sx.footerColumns}>
        <div>
          <div style={sx.footerColTitle}>MediLoop</div>
          <div style={{ color: "#64748b", fontSize: 13 }}>Helpful, transparent guidance for patients.</div>
        </div>

        <div>
          <div style={sx.footerColTitle}>Product</div>
          <a href="#" style={sx.footerLink}>Symptom Checker</a>
          <a href="#" style={sx.footerLink}>Explain Diagnosis</a>
          <a href="#" style={sx.footerLink}>Medication Safety</a>
        </div>

        <div>
          <div style={sx.footerColTitle}>Resources</div>
          <a href="#" style={sx.footerLink}>FAQ</a>
          <a href="#" style={sx.footerLink}>Guide</a>
          <a href="#" style={sx.footerLink}>Status</a>
        </div>

        <div>
          <div style={sx.footerColTitle}>Company</div>
          <a href="#" style={sx.footerLink}>About</a>
          <a href="#" style={sx.footerLink}>Contact</a>
          <a href="#" style={sx.footerLink}>Careers</a>
        </div>

        <div>
          <div style={sx.footerColTitle}>Legal</div>
          <a href="#" style={sx.footerLink}>Privacy</a>
          <a href="#" style={sx.footerLink}>Terms</a>
          <a href="#" style={sx.footerLink}>Disclaimer</a>
        </div>
      </div>

      <div style={sx.footerBottom}>
        <span>© {new Date().getFullYear()} MediLoop</span>
        <span>Not for medical diagnosis. For education only.</span>
      </div>
    </footer>
  );
}
