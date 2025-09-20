export default function Privacy() {
  return (
    <div className="container-app section max-w-3xl">
      <h1 className="section-title">Privacy Policy</h1>
      <div className="prose mt-6">
        <p>
          Your privacy is important to us. This policy explains what data we collect, how we use it, and your rights.
        </p>
        <h2>Information We Collect</h2>
        <ul>
          <li>Account information (name, email, username)</li>
          <li>Order details and delivery addresses</li>
          <li>Payment status information (handled securely by payment providers)</li>
        </ul>
        <h2>How We Use Information</h2>
        <ul>
          <li>To process orders and provide customer support</li>
          <li>To improve our products and shopping experience</li>
          <li>To prevent fraud and secure our services</li>
        </ul>
        <h2>Your Rights</h2>
        <ul>
          <li>Access, update, or delete your information</li>
          <li>Export your data upon request</li>
          <li>Opt out of marketing communications</li>
        </ul>
        <p className="text-sm opacity-80">For inquiries, contact support via the Contact page.</p>
      </div>
    </div>
  )
}
