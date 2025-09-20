import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="container-app section max-w-4xl">
      <h1 className="section-title">About Dress & Go</h1>
      
      <div className="mt-8 space-y-8">
        <section className="card">
          <div className="card-body">
            <h2 className="text-xl font-semibold mb-4">Our Story</h2>
            <p className="text-[--color-muted] leading-relaxed">
              Dress & Go was founded with a simple mission: to make fashion accessible, affordable, and enjoyable for everyone. 
              We believe that great style shouldn't break the bank, and that shopping for clothes should be a delightful experience.
            </p>
          </div>
        </section>

        <section className="card">
          <div className="card-body">
            <h2 className="text-xl font-semibold mb-4">What We Offer</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium mb-2">Quality Fashion</h3>
                <p className="text-sm text-[--color-muted]">
                  Carefully curated collections for men, women, and kids from trusted suppliers.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Affordable Prices</h3>
                <p className="text-sm text-[--color-muted]">
                  Great value without compromising on quality. Regular discounts and seasonal sales.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Fast Delivery</h3>
                <p className="text-sm text-[--color-muted]">
                  Quick and reliable shipping across Sri Lanka with multiple payment options.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-body">
            <h2 className="text-xl font-semibold mb-4">Our Commitment</h2>
            <ul className="space-y-2 text-[--color-muted]">
              <li>• Sustainable and ethical sourcing practices</li>
              <li>• Excellent customer service and support</li>
              <li>• Secure shopping with multiple payment options</li>
              <li>• Easy returns and exchanges</li>
              <li>• Regular new arrivals and trending styles</li>
            </ul>
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-xl font-semibold mb-4">Ready to Shop?</h2>
          <p className="text-[--color-muted] mb-6">
            Discover our latest collections and find your perfect style today.
          </p>
          <Link to="/products" className="btn btn-primary">
            Browse Products
          </Link>
        </section>
      </div>
    </div>
  )
}
