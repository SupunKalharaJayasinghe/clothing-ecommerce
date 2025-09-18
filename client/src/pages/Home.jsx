export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <section className="rounded-2xl border p-8">
        <h1 className="text-3xl font-bold">Welcome to MERN Store</h1>
        <p className="mt-2 opacity-80">
          Secure payments: COD, Card (PayHere), Bank transfer.
        </p>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="aspect-square rounded-lg border" />
              <div className="mt-3 font-medium">Product {i + 1}</div>
              <div className="text-sm opacity-70">LKR 0.00</div>
              <button className="mt-3 w-full rounded-lg border py-2">Add to cart</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
