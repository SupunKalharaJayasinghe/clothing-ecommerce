export default function Contact() {
  return (
    <div className="container-app section max-w-3xl">
      <h1 className="section-title">Contact Us</h1>
      <div className="card mt-6">
        <div className="card-body space-y-3">
          <p className="text-[--color-muted]">We'd love to hear from you. Reach out for any questions, issues, or feedback.</p>
          <div>
            <div className="font-medium">Email</div>
            <div className="text-sm">support@dressandgo.example</div>
          </div>
          <div>
            <div className="font-medium">Phone</div>
            <div className="text-sm">+94 11 123 4567</div>
          </div>
          <div>
            <div className="font-medium">Hours</div>
            <div className="text-sm">Mon–Fri, 9:00–17:00</div>
          </div>
        </div>
      </div>
    </div>
  )
}
