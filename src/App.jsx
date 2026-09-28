import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

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

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authSaving, setAuthSaving] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

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

  const [ratingStats, setRatingStats] = useState({})

  useEffect(() => {
    let mounted = true

    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (mounted) {
        setUser(session?.user ?? null)
        setAuthLoading(false)
      }
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    loadShoes()
  }, [user])

  const loadShoes = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('shoes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Load shoes error:', error)
      setLoading(false)
      return
    }

    const collection = (data || [])
      .filter((shoe) => !shoe.is_wishlist)
      .map((shoe) => ({
        id: shoe.id,
        brand: shoe.brand,
        model: shoe.model,
        price: shoe.price,
        size: shoe.shoe_size,
        date: shoe.purchase_date,
        notes: shoe.notes,
        image: shoe.image_url,
        owner_id: shoe.owner_id,
      }))

    const wish = (data || [])
      .filter((shoe) => shoe.is_wishlist)
      .map((shoe) => ({
        id: shoe.id,
        brand: shoe.brand,
        model: shoe.model,
        price: shoe.price,
        size: shoe.shoe_size,
        notes: shoe.notes,
        image: shoe.image_url,
        owner_id: shoe.owner_id,
      }))

    setShoes(collection)

    if (user) {
      setWishlist(wish)
    } else {
      setWishlist([])
    }

    await loadRatings(collection)

    setLoading(false)
  }

  const loadRatings = async (shoeList) => {
    if (!shoeList || shoeList.length === 0) {
      setRatingStats({})
      return
    }

    const shoeIds = shoeList.map((shoe) => shoe.id)

    const { data, error } = await supabase
      .from('shoe_ratings')
      .select('shoe_id, rating')
      .in('shoe_id', shoeIds)

    if (error) {
      console.error('Load ratings error:', error)
      return
    }

    const stats = {}

    shoeIds.forEach((id) => {
      const ratings = (data || [])
        .filter((item) => item.shoe_id === id)
        .map((item) => Number(item.rating))

      if (ratings.length === 0) {
        stats[id] = {
          average: 0,
          count: 0,
        }
      } else {
        const total = ratings.reduce((sum, rating) => sum + rating, 0)

        stats[id] = {
          average: total / ratings.length,
          count: ratings.length,
        }
      }
    })

    setRatingStats(stats)
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      alert('Please enter email and password.')
      return
    }

    try {
      setAuthSaving(true)

      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          alert(error.message)
          return
        }

        if (data.user) {
          setUser(data.user)
          setShowLogin(false)
          setEmail('')
          setPassword('')
          alert('Account created successfully!')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          alert(error.message)
          return
        }

        if (data.user) {
          setUser(data.user)
          setShowLogin(false)
          setEmail('')
          setPassword('')
        }
      }
    } catch (error) {
      console.error(error)
      alert('Something went wrong.')
    } finally {
      setAuthSaving(false)
    }
  }

  const requireLogin = () => {
    if (!user) {
      setShowLogin(true)
      return false
    }

    return true
  }

  const handleShoeChange = (e) => {
    const { name, value } = e.target

    setShoeForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleWishlistChange = (e) => {
    const { name, value } = e.target

    setWishlistForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleShoeImageChange = (e) => {
    const file = e.target.files?.[0]

    if (!file) return

    setShoeImageFile(file)

    setShoeForm((prev) => ({
      ...prev,
      image: URL.createObjectURL(file),
    }))
  }

  const handleWishlistImageChange = (e) => {
    const file = e.target.files?.[0]

    if (!file) return

    setWishlistImageFile(file)

    setWishlistForm((prev) => ({
      ...prev,
      image: URL.createObjectURL(file),
    }))
  }

  const resetShoeForm = () => {
    setShoeForm({
      brand: '',
      model: '',
      price: '',
      size: '',
      date: '',
      notes: '',
      image: '',
    })

    setShoeImageFile(null)
  }

  const resetWishlistForm = () => {
    setWishlistForm({
      brand: '',
      model: '',
      price: '',
      size: '',
      notes: '',
      image: '',
    })

    setWishlistImageFile(null)
  }

  const uploadImage = async (file) => {
    if (!file || !user) return null

    const extension = file.name.split('.').pop()

    const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('shoe-images')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Image upload error:', uploadError)
      throw uploadError
    }

    const { data } = supabase.storage
      .from('shoe-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleShoeSubmit = async (e) => {
    e.preventDefault()

    if (!requireLogin()) return

    if (
      !shoeForm.brand ||
      !shoeForm.model ||
      !shoeForm.price ||
      !shoeForm.size
    ) {
      alert('Please fill in Brand, Model, Price and Size.')
      return
    }

    try {
      setSaving(true)

      let imageUrl = null

      if (shoeImageFile) {
        imageUrl = await uploadImage(shoeImageFile)
      }

      const { error } = await supabase.from('shoes').insert({
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

      if (error) {
        console.error('Save shoe error:', error)
        alert('Could not save shoe. Please check Supabase policy.')
        return
      }

      resetShoeForm()
      setShowShoeForm(false)

      await loadShoes()
    } catch (error) {
      console.error(error)
      alert('Something went wrong while saving the shoe.')
    } finally {
      setSaving(false)
    }
  }

  const handleWishlistSubmit = async (e) => {
    e.preventDefault()

    if (!requireLogin()) return

    if (
      !wishlistForm.brand ||
      !wishlistForm.model ||
      !wishlistForm.price ||
      !wishlistForm.size
    ) {
      alert('Please fill in Brand, Model, Price and Size.')
      return
    }

    try {
      setSaving(true)

      let imageUrl = null

      if (wishlistImageFile) {
        imageUrl = await uploadImage(wishlistImageFile)
      }

      const { error } = await supabase.from('shoes').insert({
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

      if (error) {
        console.error('Save wishlist error:', error)
        alert('Could not save wishlist item.')
        return
      }

      resetWishlistForm()
      setShowWishlistForm(false)

      await loadShoes()
    } catch (error) {
      console.error(error)
      alert('Something went wrong while saving wishlist item.')
    } finally {
      setSaving(false)
    }
  }

  const deleteShoe = async (id) => {
    if (!user) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this shoe?'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('shoes')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id)

    if (error) {
      console.error('Delete shoe error:', error)
      alert('Could not delete shoe.')
      return
    }

    await loadShoes()
  }

  const deleteWishlist = async (id) => {
    if (!user) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this wishlist item?'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('shoes')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id)

    if (error) {
      console.error('Delete wishlist error:', error)
      alert('Could not delete wishlist item.')
      return
    }

    await loadShoes()
  }

  const moveToCollection = async (shoe) => {
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase
      .from('shoes')
      .update({
        is_wishlist: false,
        purchase_date: today,
      })
      .eq('id', shoe.id)
      .eq('owner_id', user.id)

    if (error) {
      console.error('Move to collection error:', error)
      alert('Could not move shoe to collection.')
      return
    }

    await loadShoes()
  }

  const handleRating = async (shoeId, rating) => {
    const storageKey = `shoe-rated-${shoeId}`

    if (localStorage.getItem(storageKey)) {
      alert('You have already rated this shoe.')
      return
    }

    const { error } = await supabase.from('shoe_ratings').insert({
      shoe_id: shoeId,
      rating: Number(rating),
    })

    if (error) {
      console.error('Rating error:', error)
      alert('Could not submit rating.')
      return
    }

    localStorage.setItem(storageKey, 'true')

    await loadRatings(shoes)

    alert('Thanks for rating this shoe!')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050d1d] text-white flex items-center justify-center">
        <p className="text-white/60">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050d1d] text-white">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#050d1d]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <a
            href="#home"
            className="text-xl sm:text-2xl font-black tracking-tight"
          >
            SOLESPACE<span className="text-blue-400">.</span>
          </a>

          <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <a href="#home" className="hover:text-white transition">
              Home
            </a>

            <a href="#collection" className="hover:text-white transition">
              Collection
            </a>

            <a href="#wishlist" className="hover:text-white transition">
              Wishlist
            </a>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button
                  onClick={() => setShowShoeForm(true)}
                  className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                >
                  + Add Shoe
                </button>

                <button
                  onClick={handleLogout}
                  className="hidden sm:block border border-white/10 hover:bg-white/5 px-4 py-2 rounded-xl text-sm transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-xl text-sm font-semibold transition"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      <section id="home" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-blue-400 uppercase tracking-[0.3em] text-xs font-bold mb-4">
            Personal Shoe Collection
          </p>

          <h1 className="text-4xl sm:text-6xl font-black leading-tight">
            Your personal
            <span className="block text-blue-400">
              sneaker space.
            </span>
          </h1>

          <p className="mt-6 text-white/60 max-w-2xl leading-relaxed">
            Keep your favorite shoes organized, discover the collection,
            and share your favorite pairs with others.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <>
                <button
                  onClick={() => setShowShoeForm(true)}
                  className="bg-white text-[#050d1d] px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition"
                >
                  Add to Collection
                </button>

                <button
                  onClick={() => setShowWishlistForm(true)}
                  className="border border-white/15 px-6 py-3 rounded-xl font-semibold hover:bg-white/5 transition"
                >
                  Add to Wishlist
                </button>
              </>
            ) : (
              <a
                href="#collection"
                className="bg-white text-[#050d1d] px-6 py-3 rounded-xl font-bold"
              >
                Explore Collection
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-14">
          <div className="bg-[#0d1b35] border border-white/10 rounded-2xl p-6">
            <p className="text-white/50 text-sm">Total Shoes</p>
            <p className="text-3xl font-black mt-2">{shoes.length}</p>
          </div>

          <div className="bg-[#0d1b35] border border-white/10 rounded-2xl p-6">
            <p className="text-white/50 text-sm">Wishlist Items</p>
            <p className="text-3xl font-black mt-2">
              {user ? wishlist.length : '—'}
            </p>
          </div>

          <div className="bg-[#0d1b35] border border-white/10 rounded-2xl p-6">
            <p className="text-white/50 text-sm">Website</p>
            <p className="text-3xl font-black mt-2">SOLESPACE</p>
          </div>
        </div>
      </section>

      <section
        id="collection"
        className="max-w-7xl mx-auto px-4 sm:px-6 pb-20"
      >
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-blue-400 uppercase tracking-[0.2em] text-xs font-bold">
              My collection
            </p>

            <h2 className="text-3xl font-black mt-2">
              The Shoes
            </h2>
          </div>

          {user && (
            <button
              onClick={() => setShowShoeForm(true)}
              className="text-sm border border-white/10 px-4 py-2 rounded-xl hover:bg-white/5 transition"
            >
              + Add Shoe
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-white/50 py-10">
            Loading collection...
          </div>
        ) : shoes.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center">
            <div className="text-5xl mb-4">👟</div>

            <h3 className="text-xl font-bold">
              No shoes yet
            </h3>

            <p className="text-white/50 mt-2">
              The collection is empty.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shoes.map((shoe) => (
              <ShoeCard
                key={shoe.id}
                shoe={shoe}
                user={user}
                onDelete={() => deleteShoe(shoe.id)}
                ratingStats={ratingStats[shoe.id]}
                onRate={(rating) => handleRating(shoe.id, rating)}
              />
            ))}
          </div>
        )}
      </section>

      {user && (
        <section
          id="wishlist"
          className="max-w-7xl mx-auto px-4 sm:px-6 pb-20"
        >
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-blue-400 uppercase tracking-[0.2em] text-xs font-bold">
                Future pickups
              </p>

              <h2 className="text-3xl font-black mt-2">
                Wishlist
              </h2>
            </div>

            <button
              onClick={() => setShowWishlistForm(true)}
              className="text-sm border border-white/10 px-4 py-2 rounded-xl hover:bg-white/5 transition"
            >
              + Add Wishlist
            </button>
          </div>

          {wishlist.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center">
              <div className="text-5xl mb-4">❤️</div>

              <h3 className="text-xl font-bold">
                Your wishlist is empty
              </h3>

              <p className="text-white/50 mt-2">
                Add shoes you want to buy in the future.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {wishlist.map((shoe) => (
                <WishlistCard
                  key={shoe.id}
                  shoe={shoe}
                  onDelete={() => deleteWishlist(shoe.id)}
                  onMove={() => moveToCollection(shoe)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {showShoeForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0d1b35] border border-white/10 rounded-3xl p-6 sm:p-8 my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-blue-400 text-xs uppercase tracking-[0.2em] font-bold">
                  Collection
                </p>

                <h2 className="text-2xl font-black mt-1">
                  Add New Shoe
                </h2>
              </div>

              <button
                onClick={() => {
                  setShowShoeForm(false)
                  resetShoeForm()
                }}
                className="w-10 h-10 rounded-xl border border-white/10 hover:bg-white/5 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleShoeSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Brand"
                  name="brand"
                  value={shoeForm.brand}
                  onChange={handleShoeChange}
                  placeholder="Nike"
                />

                <Input
                  label="Model"
                  name="model"
                  value={shoeForm.model}
                  onChange={handleShoeChange}
                  placeholder="Air Jordan 1"
                />

                <Input
                  label="Price ($)"
                  name="price"
                  type="number"
                  value={shoeForm.price}
                  onChange={handleShoeChange}
                  placeholder="150"
                />

                <Input
                  label="Size"
                  name="size"
                  value={shoeForm.size}
                  onChange={handleShoeChange}
                  placeholder="9"
                />

                <Input
                  label="Purchase Date"
                  name="date"
                  type="date"
                  value={shoeForm.date}
                  onChange={handleShoeChange}
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Shoe Photo
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleShoeImageChange}
                  className="block w-full text-sm text-white/60 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-white file:font-semibold"
                />

                {shoeForm.image && (
                  <img
                    src={shoeForm.image}
                    alt="Preview"
                    className="mt-4 w-32 h-32 object-cover rounded-2xl border border-white/10"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={shoeForm.notes}
                  onChange={handleShoeChange}
                  placeholder="Add some notes..."
                  rows="4"
                  className="w-full bg-[#08142a] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 px-5 py-3 rounded-xl font-bold transition"
              >
                {saving ? 'Saving...' : 'Add Shoe'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showWishlistForm && user && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0d1b35] border border-white/10 rounded-3xl p-6 sm:p-8 my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-blue-400 text-xs uppercase tracking-[0.2em] font-bold">
                  Wishlist
                </p>

                <h2 className="text-2xl font-black mt-1">
                  Add Wishlist Shoe
                </h2>
              </div>

              <button
                onClick={() => {
                  setShowWishlistForm(false)
                  resetWishlistForm()
                }}
                className="w-10 h-10 rounded-xl border border-white/10 hover:bg-white/5 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWishlistSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Brand"
                  name="brand"
                  value={wishlistForm.brand}
                  onChange={handleWishlistChange}
                  placeholder="Adidas"
                />

                <Input
                  label="Model"
                  name="model"
                  value={wishlistForm.model}
                  onChange={handleWishlistChange}
                  placeholder="Samba"
                />

                <Input
                  label="Price ($)"
                  name="price"
                  type="number"
                  value={wishlistForm.price}
                  onChange={handleWishlistChange}
                  placeholder="120"
                />

                <Input
                  label="Size"
                  name="size"
                  value={wishlistForm.size}
                  onChange={handleWishlistChange}
                  placeholder="9"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Shoe Photo
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleWishlistImageChange}
                  className="block w-full text-sm text-white/60 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-white file:font-semibold"
                />

                {wishlistForm.image && (
                  <img
                    src={wishlistForm.image}
                    alt="Wishlist preview"
                    className="mt-4 w-32 h-32 object-cover rounded-2xl border border-white/10"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={wishlistForm.notes}
                  onChange={handleWishlistChange}
                  placeholder="Why do you want this shoe?"
                  rows="4"
                  className="w-full bg-[#08142a] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 px-5 py-3 rounded-xl font-bold transition"
              >
                {saving ? 'Saving...' : 'Add to Wishlist'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d1b35] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-blue-400 text-xs uppercase tracking-[0.2em] font-bold">
                  SOLESPACE
                </p>

                <h2 className="text-2xl font-black mt-1">
                  {isSignup ? 'Create Account' : 'Welcome Back'}
                </h2>
              </div>

              <button
                onClick={() => setShowLogin(false)}
                className="w-10 h-10 rounded-xl border border-white/10 hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#08142a] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-[#08142a] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-400"
                />
              </div>

              <button
                type="submit"
                disabled={authSaving}
                className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 px-5 py-3 rounded-xl font-bold transition"
              >
                {authSaving
                  ? 'Please wait...'
                  : isSignup
                    ? 'Create Account'
                    : 'Login'}
              </button>
            </form>

            <button
              onClick={() => setIsSignup(!isSignup)}
              className="w-full mt-5 text-sm text-white/50 hover:text-white transition"
            >
              {isSignup
                ? 'Already have an account? Login'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      )}

      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-white/40 text-sm">
          © {new Date().getFullYear()} SOLESPACE. Your personal shoe collection.
        </div>
      </footer>
    </div>
  )
}

function Input({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
}) {
  return (
    <div>
      <label className="block text-sm text-white/70 mb-2">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-[#08142a] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-400"
      />
    </div>
  )
}

function ShoeImage({ image, alt }) {
  if (!image) {
    return (
      <div className="w-full h-56 bg-[#08142a] flex items-center justify-center text-6xl">
        👟
      </div>
    )
  }

  return (
    <img
      src={image}
      alt={alt}
      className="w-full h-56 object-cover"
    />
  )
}

function ShoeCard({
  shoe,
  user,
  onDelete,
  ratingStats,
  onRate,
}) {
  const average = ratingStats?.average || 0
  const count = ratingStats?.count || 0

  return (
    <div className="bg-[#0d1b35] border border-white/10 rounded-2xl overflow-hidden">
      <ShoeImage
        image={shoe.image}
        alt={`${shoe.brand} ${shoe.model}`}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-blue-400 text-xs uppercase tracking-wider font-bold">
              {shoe.brand}
            </p>

            <h3 className="text-xl font-bold mt-1">
              {shoe.model}
            </h3>
          </div>

          {user && (
            <button
              onClick={onDelete}
              className="text-white/30 hover:text-red-400 transition"
              title="Delete"
            >
              🗑️
            </button>
          )}
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50">Price</span>

            <span className="font-bold">
              ${Number(shoe.price || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/50">Size</span>

            <span>{shoe.size}</span>
          </div>

          {shoe.date && (
            <div className="flex justify-between">
              <span className="text-white/50">Purchased</span>

              <span>{shoe.date}</span>
            </div>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-white/10">
          <p className="text-white/50 text-sm mb-2">
            Visitor Rating
          </p>

          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-sm">
              {average > 0
                ? `${average.toFixed(1)} / 5`
                : 'No ratings yet'}
            </span>

            {count > 0 && (
              <span className="text-white/40 text-xs">
                ({count} {count === 1 ? 'rating' : 'ratings'})
              </span>
            )}
          </div>

          <div className="flex gap-1 mt-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onRate(star)}
                className="text-2xl text-white/30 hover:text-yellow-400 hover:scale-110 transition"
                title={`Give ${star} star`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {shoe.notes && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-white/50 text-sm leading-relaxed">
              {shoe.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function WishlistCard({ shoe, onDelete, onMove }) {
  return (
    <div className="bg-[#0d1b35] border border-white/10 rounded-2xl overflow-hidden">
      <ShoeImage
        image={shoe.image}
        alt={`${shoe.brand} ${shoe.model}`}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-blue-400 text-xs uppercase tracking-wider font-bold">
              {shoe.brand}
            </p>

            <h3 className="text-xl font-bold mt-1">
              {shoe.model}
            </h3>
          </div>

          <button
            onClick={onDelete}
            className="text-white/30 hover:text-red-400 transition"
            title="Delete"
          >
            🗑️
          </button>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50">Price</span>

            <span className="font-bold">
              ${Number(shoe.price || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/50">Size</span>

            <span>{shoe.size}</span>
          </div>
        </div>

        {shoe.notes && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-white/50 text-sm leading-relaxed">
              {shoe.notes}
            </p>
          </div>
        )}

        <button
          onClick={onMove}
          className="w-full mt-5 bg-white text-[#050d1d] hover:bg-white/90 px-4 py-3 rounded-xl font-bold transition"
        >
          Move to Collection
        </button>
      </div>
    </div>
  )
}

export default App