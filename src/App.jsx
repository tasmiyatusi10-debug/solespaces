
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './components/Auth'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  // ================= DATA STATES =================

  const [shoes, setShoes] = useState([])
  const [wishlist, setWishlist] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [shoeImageFile, setShoeImageFile] = useState(null)
  const [wishlistImageFile, setWishlistImageFile] = useState(null)

  // ================= FORM VISIBILITY =================

  const [showShoeForm, setShowShoeForm] = useState(false)
  const [showWishlistForm, setShowWishlistForm] = useState(false)

  // ================= SHOE FORM =================

  const [shoeForm, setShoeForm] = useState({
    brand: '',
    model: '',
    price: '',
    size: '',
    date: '',
    notes: '',
    image: '',
  })

  // ================= WISHLIST FORM =================

  const [wishlistForm, setWishlistForm] = useState({
    brand: '',
    model: '',
    price: '',
    size: '',
    notes: '',
    image: '',
  })

  // ================= AUTHENTICATION =================

  useEffect(() => {
    async function checkSession() {
      const { data, error } = await supabase.auth.getSession()
      if (error) console.error('Session error:', error)
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // ================= LOAD DATA FROM SUPABASE =================

  const loadShoes = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('shoes')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading shoes:', error)
      alert('Could not load shoes from database.')
      setLoading(false)
      return
    }

    const collectionShoes = data
      .filter((shoe) => !shoe.is_wishlist)
      .map((shoe) => ({
        id: shoe.id,
        brand: shoe.brand,
        model: shoe.model,
        price: String(shoe.price ?? ''),
        size: shoe.shoe_size ?? '',
        date: shoe.purchase_date ?? '',
        notes: shoe.notes ?? '',
        image: shoe.image_url ?? '',
      }))

    const wishlistShoes = data
      .filter((shoe) => shoe.is_wishlist)
      .map((shoe) => ({
        id: shoe.id,
        brand: shoe.brand,
        model: shoe.model,
        price: String(shoe.price ?? ''),
        size: shoe.shoe_size ?? '',
        notes: shoe.notes ?? '',
        image: shoe.image_url ?? '',
      }))

    setShoes(collectionShoes)
    setWishlist(wishlistShoes)
    setLoading(false)
  }

  useEffect(() => {
    if (user) loadShoes()
  }, [user])

  // ================= FORM HANDLERS =================

  const handleShoeChange = (event) => {
    const { name, value } = event.target

    setShoeForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }))
  }

  const handleWishlistChange = (event) => {
    const { name, value } = event.target

    setWishlistForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }))
  }

  // ================= IMAGE HANDLERS =================

  const handleShoeImageChange = (event) => {
    const file = event.target.files[0]

    if (!file) return

    const imageUrl = URL.createObjectURL(file)

    setShoeImageFile(file)

    setShoeForm((previousForm) => ({
      ...previousForm,
      image: imageUrl,
    }))
  }

  const handleWishlistImageChange = (event) => {
    const file = event.target.files[0]

    if (!file) return

    const imageUrl = URL.createObjectURL(file)

    setWishlistImageFile(file)

    setWishlistForm((previousForm) => ({
      ...previousForm,
      image: imageUrl,
    }))
  }

  // ================= RESET FORMS =================

  const resetShoeForm = () => {
    setShoeImageFile(null)
    setShoeForm({
      brand: '',
      model: '',
      price: '',
      size: '',
      date: '',
      notes: '',
      image: '',
    })
  }

  const resetWishlistForm = () => {
    setWishlistImageFile(null)
    setWishlistForm({
      brand: '',
      model: '',
      price: '',
      size: '',
      notes: '',
      image: '',
    })
  }

  // ================= IMAGE UPLOAD =================

  const uploadImage = async (file) => {
    if (!file) return null

    const fileExtension = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`

    const { error: uploadError } = await supabase.storage
      .from('shoe-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Image upload error:', uploadError)
      throw uploadError
    }

    const { data } = supabase.storage
      .from('shoe-images')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  // ================= ADD COLLECTION SHOE =================

  const handleShoeSubmit = async (event) => {
    event.preventDefault()

    if (
      !shoeForm.brand ||
      !shoeForm.model ||
      !shoeForm.price ||
      !shoeForm.size
    ) {
      alert('Please fill in Brand, Model, Price, and Size.')
      return
    }

    setSaving(true)

    try {
      const imageUrl = await uploadImage(shoeImageFile)

      const { error } = await supabase
        .from('shoes')
        .insert({
          brand: shoeForm.brand,
          model: shoeForm.model,
          price: Number(shoeForm.price),
          shoe_size: shoeForm.size,
          purchase_date: shoeForm.date || null,
          notes: shoeForm.notes,
          image_url: imageUrl,
          is_wishlist: false,
          owner_id: user.id,
        })

      if (error) throw error

      await loadShoes()

      resetShoeForm()
      setShoeImageFile(null)
      setShowShoeForm(false)
      alert('Shoe saved successfully!')
    } catch (error) {
      console.error('Error adding shoe:', error)
      alert(`Could not save shoe: ${error.message}`)
    } finally {
      setSaving(false)
    }

    return

  }

  // ================= ADD WISHLIST SHOE =================

  const handleWishlistSubmit = async (event) => {
    event.preventDefault()

    if (
      !wishlistForm.brand ||
      !wishlistForm.model ||
      !wishlistForm.price ||
      !wishlistForm.size
    ) {
      alert('Please fill in Brand, Model, Price, and Size.')
      return
    }

    setSaving(true)

    try {
      const imageUrl = await uploadImage(wishlistImageFile)

      const { error } = await supabase
        .from('shoes')
        .insert({
          brand: wishlistForm.brand,
          model: wishlistForm.model,
          price: Number(wishlistForm.price),
          shoe_size: wishlistForm.size,
          purchase_date: null,
          notes: wishlistForm.notes,
          image_url: imageUrl,
          is_wishlist: true,
          owner_id: user.id,
        })

      if (error) throw error

      await loadShoes()

      resetWishlistForm()
      setWishlistImageFile(null)
      setShowWishlistForm(false)
      alert('Wishlist item saved successfully!')
    } catch (error) {
      console.error('Error adding wishlist item:', error)
      alert(`Could not save wishlist item: ${error.message}`)
    } finally {
      setSaving(false)
    }

    return

  }

  // ================= DELETE COLLECTION SHOE =================

  const deleteShoe = async (id) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this shoe?'
    )

    if (!confirmDelete) return

    const { error } = await supabase
      .from('shoes')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id)

    if (error) {
      console.error('Error deleting shoe:', error)
      alert('Could not delete shoe. Check Supabase policies.')
      return
    }

    await loadShoes()
  }

  // ================= DELETE WISHLIST SHOE =================

  const deleteWishlistShoe = async (id) => {
    const confirmDelete = window.confirm(
      'Remove this shoe from your wishlist?'
    )

    if (!confirmDelete) return

    const { error } = await supabase
      .from('shoes')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id)

    if (error) {
      console.error('Error deleting wishlist shoe:', error)
      alert('Could not remove wishlist item.')
      return
    }

    await loadShoes()
  }

  // ================= MOVE WISHLIST TO COLLECTION =================

  const moveToCollection = async (shoe) => {
    const confirmMove = window.confirm(
      'Move this shoe to your collection?'
    )

    if (!confirmMove) return

    const { error } = await supabase
      .from('shoes')
      .update({
        is_wishlist: false,
        purchase_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', shoe.id)
      .eq('owner_id', user.id)

    if (error) {
      console.error('Error moving shoe:', error)
      alert('Could not move shoe to collection.')
      return
    }

    await loadShoes()

    alert('Shoe moved to your collection!')
  }

  // ================= LOGOUT =================

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      alert(`Logout error: ${error.message}`)
      return
    }
    setUser(null)
  }

  // ================= REUSABLE SHOE IMAGE =================

  const ShoeImage = ({ shoe }) => {
    return (
      <div className="relative flex h-64 items-center justify-center overflow-hidden bg-[#e8e6e0]">
        {shoe.image ? (
          <img
            src={shoe.image}
            alt={shoe.model}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="text-7xl">👟</span>
        )}
      </div>
    )
  }

  // ================= AUTH / LOADING SCREEN =================

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050d1d]">
        <p className="font-semibold">Checking login...</p>
      </div>
    )
  }

  if (!user) {
    return <Auth onLogin={setUser} />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050d1d]">
        <div className="text-center">
          <div className="text-4xl">👟</div>
          <p className="mt-4 font-semibold">
            Loading SOLESPACE...
          </p>
        </div>
      </div>
    )
  }

  // ================= MAIN UI =================

  return (
    <div className="min-h-screen bg-[#050d1d] text-slate-100 selection:bg-blue-500/30">

      {/* ================= NAVBAR ================= */}

      <nav className="sticky top-0 z-20 mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 bg-[#050d1d]/90 px-6 py-3 backdrop-blur-xl md:px-12">
        <h1 className="text-2xl font-black tracking-[-0.08em] md:text-3xl">
          SOLESPACE<span className="text-blue-500">.</span>
        </h1>

        <div className="hidden gap-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 md:flex">
          <a
            href="#home"
            className="transition-colors hover:text-blue-500"
          >
            Home
          </a>

          <a
            href="#collection"
            className="transition-colors hover:text-blue-500"
          >
            Collection
          </a>

          <a
            href="#wishlist"
            className="transition-colors hover:text-blue-500"
          >
            Wishlist
          </a>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setShowShoeForm(!showShoeForm)}
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-blue-400"
          >
            Add Shoe
          </button>

          <button
            onClick={handleLogout}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ================= HERO ================= */}

      <main className="relative overflow-hidden px-6 pb-20 pt-10 md:px-12 md:pb-28 md:pt-16">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-40 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

        <section
          id="home"
          className="mx-auto max-w-7xl"
        >
          <p className="mb-5 inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-blue-300">
            Your personal sneaker space
          </p>

          <h2 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.07em] md:text-7xl">
            Every pair has
            <span className="block text-blue-500">
              a story.
            </span>
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
            Organize your shoe collection, save your favorite pairs,
            and discover your next addition.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="#collection"
              className="rounded-full bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:bg-blue-400"
            >
              Explore Collection
            </a>

            <button
              onClick={() => setShowWishlistForm(true)}
              className="rounded-full border border-white/10 bg-white/5 px-6 py-3.5 font-semibold transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              Add to Wishlist
            </button>
          </div>
        </section>

        {/* ================= STATS ================= */}

        <section className="mx-auto mt-8 grid max-w-7xl gap-4 md:grid-cols-4">

          <div className="rounded-2xl border border-white/10 bg-[#0d1b35]/90 p-5 shadow-[0_20px_60px_-35px_rgba(15,76,129,0.28)] backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
              Total Shoes
            </p>

            <h3 className="mt-3 text-5xl font-black tracking-[-0.06em]">
              {shoes.length}
            </h3>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1b35]/90 p-5 shadow-[0_20px_60px_-35px_rgba(15,76,129,0.28)] backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
              Wishlist Items
            </p>

            <h3 className="mt-3 text-5xl font-black tracking-[-0.06em]">
              {wishlist.length}
            </h3>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1b35]/90 p-5 shadow-[0_20px_60px_-35px_rgba(15,76,129,0.28)] backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
              Website
            </p>

            <h3 className="mt-3 text-2xl font-black tracking-[-0.04em]">
              SOLESPACE
            </h3>
          </div>

        </section>

        {/* ================= ADD SHOE FORM ================= */}

        {showShoeForm && (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 md:items-center">
    <section className="w-full max-w-4xl rounded-3xl border border-blue-200/10 bg-[#0d1b35] p-5 shadow-2xl md:max-h-[90vh] md:overflow-y-auto md:p-10">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
                  Your collection
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Add New Shoe
                </h2>
              </div>

              <button
                onClick={() => setShowShoeForm(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={handleShoeSubmit}
              className="space-y-6"
            >
              <div className="grid gap-6 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Brand *
                  </label>

                  <input
                    type="text"
                    name="brand"
                    value={shoeForm.brand}
                    onChange={handleShoeChange}
                    placeholder="e.g. Nike"
                    className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-[#0d1b35] focus:ring-4 focus:ring-blue-500/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Model Name *
                  </label>

                  <input
                    type="text"
                    name="model"
                    value={shoeForm.model}
                    onChange={handleShoeChange}
                    placeholder="e.g. Air Jordan 1"
                    className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-[#0d1b35] focus:ring-4 focus:ring-blue-500/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Price (৳) *
                  </label>

                  <input
                    type="number"
                    name="price"
                    value={shoeForm.price}
                    onChange={handleShoeChange}
                    placeholder="12000"
                    min="0"
                    className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-[#0d1b35] focus:ring-4 focus:ring-blue-500/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Shoe Size *
                  </label>

                  <input
                    type="text"
                    name="size"
                    value={shoeForm.size}
                    onChange={handleShoeChange}
                    placeholder="e.g. 42"
                    className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-[#0d1b35] focus:ring-4 focus:ring-blue-500/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Purchase Date
                  </label>

                  <input
                    type="date"
                    name="date"
                    value={shoeForm.date}
                    onChange={handleShoeChange}
                    className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-[#0d1b35] focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Shoe Photo
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleShoeImageChange}
                    className="w-full rounded-2xl border border-dashed border-white/15 bg-[#07142a] px-3 py-3 text-sm"
                  />
                </div>

              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={shoeForm.notes}
                  onChange={handleShoeChange}
                  placeholder="Write something about your shoe..."
                  rows="4"
                  className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-[#0d1b35] focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {shoeForm.image && (
                <img
                  src={shoeForm.image}
                  alt="Shoe preview"
                  className="h-56 w-full rounded-2xl object-cover shadow-lg md:w-72"
                />
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-blue-600 py-4 font-semibold text-white shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Shoe to Collection'}
              </button>

            </form>
         
    </section>
  </div>
)}
        {/* ================= COLLECTION ================= */}

        <section
          id="collection"
          className="mx-auto mt-10 max-w-7xl"
        >
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
                Your pairs
              </p>

              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                My Collection
              </h2>
            </div>

            <span className="rounded-full bg-[#0d1b35] px-4 py-2 text-sm font-semibold">
              {shoes.length} Shoes
            </span>
          </div>

          {shoes.length === 0 ? (
            <div className="rounded-2xl bg-[#0d1b35] p-7 text-center shadow-sm">
              <p className="text-5xl">👟</p>

              <h3 className="mt-4 text-xl font-bold">
                Your collection is empty
              </h3>

              <p className="mt-2 text-slate-400">
                Add your first shoe to your collection.
              </p>

              <button
                onClick={() => setShowShoeForm(true)}
                className="mt-6 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-400"
              >
                Add First Shoe
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shoes.map((shoe) => (
                <div
                  key={shoe.id}
                  className="group overflow-hidden rounded-3xl border border-blue-200/10 bg-[#0d1b35] shadow-[0_20px_60px_-35px_rgba(15,76,129,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_-35px_rgba(37,99,235,0.22)]"
                >
                  <ShoeImage shoe={shoe} />

                  <div className="p-7">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
                      {shoe.brand}
                    </p>

                    <h3 className="mt-2 text-xl font-black tracking-[-0.03em]">
                      {shoe.model}
                    </h3>

                    <p className="mt-3 text-lg font-black">
                      ৳{Number(shoe.price).toLocaleString()}
                    </p>

                    <p className="mt-2 text-xs font-medium text-slate-400">
                      Size: {shoe.size}
                    </p>

                    {shoe.date && (
                      <p className="mt-2 text-xs font-medium text-slate-400">
                        Purchased: {shoe.date}
                      </p>
                    )}

                    {shoe.notes && (
                      <p className="mt-4 text-sm leading-relaxed text-slate-300">
                        {shoe.notes}
                      </p>
                    )}

                    <button
                      onClick={() => deleteShoe(shoe.id)}
                      className="mt-4 w-full rounded-2xl border border-red-500/30 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
                    >
                      Delete Shoe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ================= WISHLIST FORM ================= */}

        {showWishlistForm && (
          <section className="mx-auto mt-10 max-w-4xl rounded-3xl border border-blue-200/10 bg-[#0d1b35] p-5 shadow-[0_30px_80px_-45px_rgba(0,0,0,0.45)] md:p-10">

            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
                  Future purchases
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Add to Wishlist
                </h2>
              </div>

              <button
                onClick={() => setShowWishlistForm(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={handleWishlistSubmit}
              className="space-y-6"
            >
              <div className="grid gap-6 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Brand *
                  </label>

                  <input
                    type="text"
                    name="brand"
                    value={wishlistForm.brand}
                    onChange={handleWishlistChange}
                    placeholder="e.g. Nike"
                    className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-[#0d1b35] focus:ring-4 focus:ring-blue-500/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Model Name *
                  </label>

                  <input
                    type="text"
                    name="model"
                    value={wishlistForm.model}
                    onChange={handleWishlistChange}
                    placeholder="e.g. Air Jordan 4"
                    className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-[#0d1b35] focus:ring-4 focus:ring-blue-500/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Expected Price (৳) *
                  </label>

                  <input
                    type="number"
                    name="price"
                    value={wishlistForm.price}
                    onChange={handleWishlistChange}
                    placeholder="15000"
                    min="0"
                    className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-[#0d1b35] focus:ring-4 focus:ring-blue-500/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Shoe Size *
                  </label>

                  <input
                    type="text"
                    name="size"
                    value={wishlistForm.size}
                    onChange={handleWishlistChange}
                    placeholder="e.g. 42"
                    className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-[#0d1b35] focus:ring-4 focus:ring-blue-500/10"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold">
                    Shoe Photo
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleWishlistImageChange}
                    className="w-full rounded-2xl border border-dashed border-white/15 bg-[#07142a] px-3 py-3 text-sm"
                  />
                </div>

              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={wishlistForm.notes}
                  onChange={handleWishlistChange}
                  placeholder="Why do you want this shoe?"
                  rows="4"
                  className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-[#0d1b35] focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {wishlistForm.image && (
                <img
                  src={wishlistForm.image}
                  alt="Wishlist shoe preview"
                  className="h-56 w-full rounded-2xl object-cover shadow-lg md:w-72"
                />
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-blue-500 py-4 font-semibold text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save to Wishlist ❤️'}
              </button>

            </form>
          </section>
        )}

        {/* ================= WISHLIST ================= */}

        <section
          id="wishlist"
          className="mx-auto mt-10 max-w-7xl"
        >
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
                Future purchases
              </p>

              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                My Wishlist ❤️
              </h2>
            </div>

            <span className="rounded-full bg-[#0d1b35] px-4 py-2 text-sm font-semibold">
              {wishlist.length} Items
            </span>
          </div>

          {wishlist.length === 0 ? (
            <div className="rounded-2xl bg-[#0d1b35] p-7 text-center shadow-sm">
              <p className="text-4xl">❤️</p>

              <h3 className="mt-4 text-xl font-bold">
                Your wishlist is empty
              </h3>

              <p className="mt-2 text-slate-400">
                Add shoes you want to buy in the future.
              </p>

              <button
                onClick={() => setShowWishlistForm(true)}
                className="mt-6 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-400"
              >
                Add First Wishlist Shoe
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {wishlist.map((shoe) => (
                <div
                  key={shoe.id}
                  className="group overflow-hidden rounded-3xl border border-blue-200/10 bg-[#0d1b35] shadow-[0_20px_60px_-35px_rgba(15,76,129,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_-35px_rgba(37,99,235,0.22)]"
                >
                  <ShoeImage shoe={shoe} />

                  <div className="p-7">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
                      {shoe.brand}
                    </p>

                    <h3 className="mt-2 text-xl font-black tracking-[-0.03em]">
                      {shoe.model}
                    </h3>

                    <p className="mt-3 text-lg font-black">
                      ৳{Number(shoe.price).toLocaleString()}
                    </p>

                    <p className="mt-2 text-xs font-medium text-slate-400">
                      Size: {shoe.size}
                    </p>

                    {shoe.notes && (
                      <p className="mt-4 text-sm leading-relaxed text-slate-300">
                        {shoe.notes}
                      </p>
                    )}

                    <button
                      onClick={() => moveToCollection(shoe)}
                      className="mt-4 w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
                    >
                      Move to Collection
                    </button>

                    <button
                      onClick={() => deleteWishlistShoe(shoe.id)}
                      className="mt-3 w-full rounded-2xl border border-red-500/30 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
                    >
                      Remove from Wishlist
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* ================= FOOTER ================= */}

      <footer className="border-t border-white/10 px-6 py-10 text-center text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
        © 2026 SOLESPACE. Your shoes, your story.
      </footer>

    </div>
  )
}

export default App