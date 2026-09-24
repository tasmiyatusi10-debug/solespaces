
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './components/Auth'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [shoes, setShoes] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [shoeImageFile, setShoeImageFile] = useState(null)
  const [wishlistImageFile, setWishlistImageFile] = useState(null)

  const [showShoeForm, setShowShoeForm] = useState(false)
  const [showWishlistForm, setShowWishlistForm] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const [shoeForm, setShoeForm] = useState({
    brand: '',
    model: '',
    price: '',
    size: '',
    date: '',
    notes: '',
    image: '',
  })

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

      if (error) {
        console.error('Session error:', error)
      }

      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ================= LOAD PUBLIC DATA =================

  const loadShoes = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('shoes')
      .select('*')
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
        owner_id: shoe.owner_id,
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
        owner_id: shoe.owner_id,
      }))

    setShoes(collectionShoes)
    setWishlist(wishlistShoes)
    setLoading(false)
  }

  useEffect(() => {
    loadShoes()
  }, [])

  // ================= LOGIN CHECK =================

  const requireLogin = () => {
    if (!user) {
      setShowLogin(true)
      return false
    }

    return true
  }

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

    setShoeImageFile(file)

    setShoeForm((previousForm) => ({
      ...previousForm,
      image: URL.createObjectURL(file),
    }))
  }

  const handleWishlistImageChange = (event) => {
    const file = event.target.files[0]

    if (!file) return

    setWishlistImageFile(file)

    setWishlistForm((previousForm) => ({
      ...previousForm,
      image: URL.createObjectURL(file),
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
    if (!file || !user) return null

    const fileExtension = file.name.split('.').pop()

    const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`

    const { error: uploadError } = await supabase.storage
      .from('shoe-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
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

    if (!requireLogin()) return

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
      setShowShoeForm(false)

      alert('Shoe saved successfully!')
    } catch (error) {
      console.error('Error adding shoe:', error)
      alert(`Could not save shoe: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ================= ADD WISHLIST SHOE =================

  const handleWishlistSubmit = async (event) => {
    event.preventDefault()

    if (!requireLogin()) return

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
      setShowWishlistForm(false)

      alert('Wishlist item saved successfully!')
    } catch (error) {
      console.error('Error adding wishlist item:', error)
      alert(`Could not save wishlist item: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ================= DELETE COLLECTION SHOE =================

  const deleteShoe = async (id) => {
    if (!requireLogin()) return

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
      alert('Could not delete shoe.')
      return
    }

    await loadShoes()
  }

  // ================= DELETE WISHLIST SHOE =================

  const deleteWishlistShoe = async (id) => {
    if (!requireLogin()) return

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

  // ================= MOVE TO COLLECTION =================

  const moveToCollection = async (shoe) => {
    if (!requireLogin()) return

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

  // ================= REUSABLE IMAGE =================

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

  // ================= SHOE CARD =================

  const ShoeCard = ({ shoe, isWishlist = false }) => {
    return (
      <div className="group overflow-hidden rounded-3xl border border-blue-200/10 bg-[#0d1b35] shadow-[0_20px_60px_-35px_rgba(15,76,129,0.28)] transition duration-300 hover:-translate-y-1">
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

          {!isWishlist && shoe.date && (
            <p className="mt-2 text-xs font-medium text-slate-400">
              Purchased: {shoe.date}
            </p>
          )}

          {shoe.notes && (
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              {shoe.notes}
            </p>
          )}

          {isWishlist ? (
            <>
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
            </>
          ) : (
            <button
              onClick={() => deleteShoe(shoe.id)}
              className="mt-4 w-full rounded-2xl border border-red-500/30 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
            >
              Delete Shoe
            </button>
          )}
        </div>
      </div>
    )
  }

  // ================= LOADING =================

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050d1d] text-white">
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
          <a href="#home" className="transition-colors hover:text-blue-500">
            Home
          </a>

          <a href="#collection" className="transition-colors hover:text-blue-500">
            Collection
          </a>

          <a href="#wishlist" className="transition-colors hover:text-blue-500">
            Wishlist
          </a>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => {
              if (!requireLogin()) return

              setShowShoeForm(true)
              setShowWishlistForm(false)
            }}
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            Add Shoe
          </button>

          {user ? (
            <button
              onClick={handleLogout}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
            >
              Login
            </button>
          )}
        </div>
      </nav>

      {/* ================= HERO ================= */}

      <main className="relative overflow-hidden px-6 pb-20 pt-10 md:px-12 md:pb-28 md:pt-16">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-3xl" />

        <section id="home" className="mx-auto max-w-7xl">
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
              className="rounded-full bg-blue-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-400"
            >
              Explore Collection
            </a>

            <button
              onClick={() => {
                if (!requireLogin()) return

                setShowWishlistForm(true)
                setShowShoeForm(false)
              }}
              className="rounded-full border border-white/10 bg-white/5 px-6 py-3.5 font-semibold transition hover:bg-white/10"
            >
              Add to Wishlist
            </button>
          </div>
        </section>

        {/* ================= STATS ================= */}

        <section className="mx-auto mt-8 grid max-w-7xl gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0d1b35]/90 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
              Total Shoes
            </p>

            <h3 className="mt-3 text-5xl font-black">
              {shoes.length}
            </h3>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1b35]/90 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
              Wishlist Items
            </p>

            <h3 className="mt-3 text-5xl font-black">
              {wishlist.length}
            </h3>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1b35]/90 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
              Website
            </p>

            <h3 className="mt-3 text-2xl font-black">
              SOLESPACE
            </h3>
          </div>
        </section>

        {/* ================= ADD SHOE POPUP ================= */}

        {showShoeForm && user && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 md:items-center">
            <section className="w-full max-w-3xl rounded-3xl border border-blue-200/10 bg-[#0d1b35] p-5 shadow-2xl md:p-10">
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
                  type="button"
                  onClick={() => {
                    setShowShoeForm(false)
                    resetShoeForm()
                  }}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleShoeSubmit} className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <input
                    type="text"
                    name="brand"
                    value={shoeForm.brand}
                    onChange={handleShoeChange}
                    placeholder="Brand *"
                    required
                    className="rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none focus:border-blue-500"
                  />

                  <input
                    type="text"
                    name="model"
                    value={shoeForm.model}
                    onChange={handleShoeChange}
                    placeholder="Model Name *"
                    required
                    className="rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none focus:border-blue-500"
                  />

                  <input
                    type="number"
                    name="price"
                    value={shoeForm.price}
                    onChange={handleShoeChange}
                    placeholder="Price (৳) *"
                    min="0"
                    required
                    className="rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none focus:border-blue-500"
                  />

                  <input
                    type="text"
                    name="size"
                    value={shoeForm.size}
                    onChange={handleShoeChange}
                    placeholder="Shoe Size *"
                    required
                    className="rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none focus:border-blue-500"
                  />

                  <input
                    type="date"
                    name="date"
                    value={shoeForm.date}
                    onChange={handleShoeChange}
                    className="rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none focus:border-blue-500"
                  />

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleShoeImageChange}
                    className="rounded-2xl border border-dashed border-white/15 bg-[#07142a] px-3 py-3 text-sm"
                  />
                </div>

                <textarea
                  name="notes"
                  value={shoeForm.notes}
                  onChange={handleShoeChange}
                  placeholder="Write something about your shoe..."
                  rows="4"
                  className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none focus:border-blue-500"
                />

                {shoeForm.image && (
                  <img
                    src={shoeForm.image}
                    alt="Shoe preview"
                    className="h-56 w-full rounded-2xl object-cover md:w-72"
                  />
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-blue-600 py-4 font-semibold text-white hover:bg-blue-400 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add Shoe to Collection'}
                </button>
              </form>
            </section>
          </div>
        )}

        {/* ================= COLLECTION ================= */}

        <section id="collection" className="mx-auto mt-10 max-w-7xl">
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
            <div className="rounded-2xl bg-[#0d1b35] p-7 text-center">
              <p className="text-5xl">👟</p>

              <h3 className="mt-4 text-xl font-bold">
                Your collection is empty
              </h3>

              <p className="mt-2 text-slate-400">
                Add your first shoe to your collection.
              </p>

              <button
                onClick={() => {
                  if (!requireLogin()) return

                  setShowShoeForm(true)
                  setShowWishlistForm(false)
                }}
                className="mt-6 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-400"
              >
                Add First Shoe
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shoes.map((shoe) => (
                <ShoeCard key={shoe.id} shoe={shoe} />
              ))}
            </div>
          )}
        </section>

        {/* ================= WISHLIST POPUP ================= */}

        {showWishlistForm && user && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 md:items-center">
            <section className="w-full max-w-3xl rounded-3xl border border-blue-200/10 bg-[#0d1b35] p-5 shadow-2xl md:p-10">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
                    Future purchases
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    Add to Wishlist ❤️
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowWishlistForm(false)
                    resetWishlistForm()
                  }}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleWishlistSubmit} className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <input
                    type="text"
                    name="brand"
                    value={wishlistForm.brand}
                    onChange={handleWishlistChange}
                    placeholder="Brand *"
                    required
                    className="rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none focus:border-blue-500"
                  />

                  <input
                    type="text"
                    name="model"
                    value={wishlistForm.model}
                    onChange={handleWishlistChange}
                    placeholder="Model Name *"
                    required
                    className="rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none focus:border-blue-500"
                  />

                  <input
                    type="number"
                    name="price"
                    value={wishlistForm.price}
                    onChange={handleWishlistChange}
                    placeholder="Expected Price (৳) *"
                    min="0"
                    required
                    className="rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none focus:border-blue-500"
                  />

                  <input
                    type="text"
                    name="size"
                    value={wishlistForm.size}
                    onChange={handleWishlistChange}
                    placeholder="Shoe Size *"
                    required
                    className="rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none focus:border-blue-500"
                  />

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleWishlistImageChange}
                    className="rounded-2xl border border-dashed border-white/15 bg-[#07142a] px-3 py-3 text-sm md:col-span-2"
                  />
                </div>

                <textarea
                  name="notes"
                  value={wishlistForm.notes}
                  onChange={handleWishlistChange}
                  placeholder="Why do you want this shoe?"
                  rows="4"
                  className="w-full rounded-2xl border border-white/10 bg-[#07142a] px-4 py-3.5 outline-none focus:border-blue-500"
                />

                {wishlistForm.image && (
                  <img
                    src={wishlistForm.image}
                    alt="Wishlist shoe preview"
                    className="h-56 w-full rounded-2xl object-cover md:w-72"
                  />
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-blue-500 py-4 font-semibold text-white hover:bg-blue-400 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save to Wishlist ❤️'}
                </button>
              </form>
            </section>
          </div>
        )}

        {/* ================= WISHLIST ================= */}

        <section id="wishlist" className="mx-auto mt-10 max-w-7xl">
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
            <div className="rounded-2xl bg-[#0d1b35] p-7 text-center">
              <p className="text-4xl">❤️</p>

              <h3 className="mt-4 text-xl font-bold">
                Your wishlist is empty
              </h3>

              <p className="mt-2 text-slate-400">
                Add shoes you want to buy in the future.
              </p>

              <button
                onClick={() => {
                  if (!requireLogin()) return

                  setShowWishlistForm(true)
                  setShowShoeForm(false)
                }}
                className="mt-6 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-400"
              >
                Add First Wishlist Shoe
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {wishlist.map((shoe) => (
                <ShoeCard key={shoe.id} shoe={shoe} isWishlist />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ================= LOGIN POPUP ================= */}

      {showLogin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6">
          <div className="relative w-full max-w-md">
            <button
              type="button"
              onClick={() => setShowLogin(false)}
              className="absolute right-3 top-3 z-10 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
            >
              ✕
            </button>

            <Auth
              onLogin={(loggedInUser) => {
                setUser(loggedInUser)
                setShowLogin(false)
              }}
              onCancel={() => setShowLogin(false)}
            />
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}

      <footer className="border-t border-white/10 px-6 py-10 text-center text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
        © 2026 SOLESPACE. Your shoes, your story.
      </footer>
    </div>
  )
}

export default App