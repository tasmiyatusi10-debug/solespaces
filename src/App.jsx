import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [shoes, setShoes] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [ratingStats, setRatingStats] = useState({})
  const [ratedShoes, setRatedShoes] = useState({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [shoeImageFile, setShoeImageFile] = useState(null)
  const [wishlistImageFile, setWishlistImageFile] = useState(null)

  const [showShoeForm, setShowShoeForm] = useState(false)
  const [showWishlistForm, setShowWishlistForm] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingShoe, setEditingShoe] = useState(null)

  // Rating success popup
  const [showRatingSuccess, setShowRatingSuccess] = useState(false)

  const [shoeForm, setShoeForm] = useState({
    brand: '',
    model: '',
    price: '',
    size: '',
    date: '',
    notes: '',
    image: '',
  })

  const [editForm, setEditForm] = useState({
    brand: '',
    model: '',
    price: '',
    size: '',
    date: '',
    notes: '',
    image: '',
  })

  const [editImageFile, setEditImageFile] = useState(null)

  const [wishlistForm, setWishlistForm] = useState({
    brand: '',
    model: '',
    price: '',
    size: '',
    notes: '',
    image: '',
  })

  // Load previously rated shoes from browser
  useEffect(() => {
    try {
      const savedRatings = JSON.parse(
        localStorage.getItem('ratedShoes') || '{}'
      )

      setRatedShoes(savedRatings)
    } catch {
      setRatedShoes({})
    }
  }, [])

  // Authentication
  useEffect(() => {
    let mounted = true

    const getSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (!mounted) return

      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Load public collection + private wishlist
  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)

      // PUBLIC COLLECTION
      const {
        data: collectionData,
        error: collectionError,
      } = await supabase
        .from('shoes')
        .select('*')
        .eq('is_wishlist', false)
        .order('created_at', { ascending: false })

      if (collectionError) {
        console.error('Collection error:', collectionError)
      }

      const collection = (collectionData || []).map((shoe) => ({
        ...shoe,
      }))

      setShoes(collection)

      // LOAD RATINGS
      if (collection.length > 0) {
        const shoeIds = collection.map((shoe) => String(shoe.id))

        const {
          data: ratings,
          error: ratingsError,
        } = await supabase
          .from('shoe_ratings')
          .select('shoe_id, rating')
          .in('shoe_id', shoeIds)

        if (ratingsError) {
          console.error('Rating load error:', ratingsError)
          setRatingStats({})
        } else {
          const stats = {}

          ;(ratings || []).forEach((item) => {
            const id = String(item.shoe_id)
            const rating = Number(item.rating)

            if (!stats[id]) {
              stats[id] = {
                total: 0,
                count: 0,
                average: 0,
              }
            }

            stats[id].total += rating
            stats[id].count += 1
          })

          Object.keys(stats).forEach((id) => {
            stats[id].average =
              stats[id].total / stats[id].count
          })

          setRatingStats(stats)
        }
      } else {
        setRatingStats({})
      }

      // PRIVATE WISHLIST
      if (user) {
        const {
          data: wishlistData,
          error: wishlistError,
        } = await supabase
          .from('shoes')
          .select('*')
          .eq('owner_id', user.id)
          .eq('is_wishlist', true)
          .order('created_at', { ascending: false })

        if (wishlistError) {
          console.error('Wishlist error:', wishlistError)
        }

        setWishlist(wishlistData || [])
      } else {
        setWishlist([])
      }
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const requireLogin = () => {
    if (!user) {
      setShowLogin(true)
      return false
    }

    return true
  }

  const uploadImage = async (file) => {
    if (!file || !user) return null

    const extension =
      file.name.split('.').pop()?.toLowerCase() || 'jpg'

    const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('shoe-images')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    const { data } = supabase.storage
      .from('shoe-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  // ADD SHOE
  const handleAddShoe = async (e) => {
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

      const { error } = await supabase.from('shoes').insert([
        {
          brand: shoeForm.brand,
          model: shoeForm.model,
          price: Number(shoeForm.price),
          shoe_size: shoeForm.size,
          purchase_date: shoeForm.date || null,
          notes: shoeForm.notes,
          image_url: imageUrl,
          is_wishlist: false,
          owner_id: user.id,
        },
      ])

      if (error) {
        console.error('Save shoe error:', error)
        alert('Could not save shoe. Please check Supabase policy.')
        return
      }

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
      setShowShoeForm(false)

      await loadData()
    } catch (error) {
      console.error(error)
      alert('Something went wrong while adding the shoe.')
    } finally {
      setSaving(false)
    }
  }

  // OPEN EDIT SHOE
  const openEditShoe = (shoe) => {
    if (!user || shoe.owner_id !== user.id) return

    setEditingShoe(shoe)

    setEditForm({
      brand: shoe.brand || '',
      model: shoe.model || '',
      price: shoe.price ?? '',
      size: shoe.shoe_size || '',
      date: shoe.purchase_date || '',
      notes: shoe.notes || '',
      image: shoe.image_url || '',
    })

    setEditImageFile(null)
    setShowEditForm(true)
  }

  // UPDATE SHOE
  const handleEditShoe = async (e) => {
    e.preventDefault()

    if (!user || !editingShoe) return

    if (
      !editForm.brand ||
      !editForm.model ||
      !editForm.price ||
      !editForm.size
    ) {
      alert('Please fill in Brand, Model, Price and Size.')
      return
    }

    try {
      setSaving(true)

      let imageUrl = editForm.image || null

      // Only upload a new image if the user selected one.
      if (editImageFile) {
        imageUrl = await uploadImage(editImageFile)
      }

      const { error } = await supabase
        .from('shoes')
        .update({
          brand: editForm.brand,
          model: editForm.model,
          price: Number(editForm.price),
          shoe_size: editForm.size,
          purchase_date: editForm.date || null,
          notes: editForm.notes,
          image_url: imageUrl,
        })
        .eq('id', editingShoe.id)
        .eq('owner_id', user.id)

      if (error) {
        console.error('Update shoe error:', error)
        alert('Could not update shoe. Please check Supabase policy.')
        return
      }

      setShowEditForm(false)
      setEditingShoe(null)
      setEditImageFile(null)

      await loadData()
    } catch (error) {
      console.error(error)
      alert('Something went wrong while updating the shoe.')
    } finally {
      setSaving(false)
    }
  }

  // ADD WISHLIST
  const handleAddWishlist = async (e) => {
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

      const { error } = await supabase.from('shoes').insert([
        {
          brand: wishlistForm.brand,
          model: wishlistForm.model,
          price: Number(wishlistForm.price),
          shoe_size: wishlistForm.size,
          purchase_date: null,
          notes: wishlistForm.notes,
          image_url: imageUrl,
          is_wishlist: true,
          owner_id: user.id,
        },
      ])

      if (error) {
        console.error('Wishlist save error:', error)
        alert('Could not save wishlist item.')
        return
      }

      setWishlistForm({
        brand: '',
        model: '',
        price: '',
        size: '',
        notes: '',
        image: '',
      })

      setWishlistImageFile(null)
      setShowWishlistForm(false)

      await loadData()
    } catch (error) {
      console.error(error)
      alert('Something went wrong while adding wishlist item.')
    } finally {
      setSaving(false)
    }
  }

  // DELETE SHOE
  const handleDeleteShoe = async (shoeId) => {
    if (!user) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this shoe?'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('shoes')
      .delete()
      .eq('id', shoeId)
      .eq('owner_id', user.id)

    if (error) {
      console.error(error)
      alert('Could not delete shoe.')
      return
    }

    await loadData()
  }

  // DELETE WISHLIST
  const handleDeleteWishlist = async (shoeId) => {
    if (!user) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this wishlist item?'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('shoes')
      .delete()
      .eq('id', shoeId)
      .eq('owner_id', user.id)

    if (error) {
      console.error(error)
      alert('Could not delete wishlist item.')
      return
    }

    await loadData()
  }

  // MOVE WISHLIST TO COLLECTION
  const moveToCollection = async (shoe) => {
    if (!user) return

    const { error } = await supabase
      .from('shoes')
      .update({
        is_wishlist: false,
        purchase_date: new Date()
          .toISOString()
          .split('T')[0],
      })
      .eq('id', shoe.id)
      .eq('owner_id', user.id)

    if (error) {
      console.error(error)
      alert('Could not move shoe to collection.')
      return
    }

    await loadData()
  }

  // SUBMIT RATING
  const submitRating = async (shoeId, rating) => {
    const numericRating = Number(rating)

    if (
      !numericRating ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return
    }

    const shoe = shoes.find(
      (item) => String(item.id) === String(shoeId)
    )

    if (!shoe) return

    // Owner cannot rate own shoe
    if (user && shoe.owner_id === user.id) {
      alert("You can't rate your own shoe.")
      return
    }

    // Same browser cannot rate same shoe twice
    if (ratedShoes[String(shoeId)]) {
      return
    }

    const { error } = await supabase
      .from('shoe_ratings')
      .insert([
        {
          shoe_id: String(shoeId),
          rating: numericRating,
        },
      ])

    if (error) {
      console.error('Rating error:', error)
      alert(
        'Could not submit rating. Please check Supabase policy.'
      )
      return
    }

    const updatedRatings = {
      ...ratedShoes,
      [String(shoeId)]: numericRating,
    }

    setRatedShoes(updatedRatings)

    localStorage.setItem(
      'ratedShoes',
      JSON.stringify(updatedRatings)
    )

    // Refresh rating numbers
    await loadData()

    // Show beautiful success popup
    setShowRatingSuccess(true)

    setTimeout(() => {
      setShowRatingSuccess(false)
    }, 3000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050d1d] flex items-center justify-center text-white">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050d1d] text-white">

      {/* =========================
          RATING SUCCESS POPUP
      ========================== */}
      {showRatingSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl border border-blue-400/20 bg-[#0d1b35] p-8 text-center shadow-2xl shadow-black/50">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-3xl ring-1 ring-blue-400/20">
              ⭐
            </div>

            <h3 className="text-2xl font-semibold text-white">
              Rating Submitted!
            </h3>

            <p className="mt-3 text-sm leading-6 text-white/60">
              Thank you for rating this shoe.
              <br />
              Your feedback has been added successfully.
            </p>

            <button
              onClick={() => setShowRatingSuccess(false)}
              className="mt-7 w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 active:scale-[0.98]"
            >
              ✓ Done
            </button>

          </div>
        </div>
      )}

      {/* =========================
          NAVBAR
      ========================== */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#050d1d]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-5 sm:py-4">

          <a
            href="#home"
            className="shrink-0 text-base font-bold tracking-[0.15em] text-white sm:text-xl sm:tracking-[0.2em]"
          >
            SOLESPACE
          </a>

          <div className="hidden items-center gap-7 md:flex">
            <a
              href="#home"
              className="text-sm text-white/70 transition hover:text-white"
            >
              Home
            </a>

            <a
              href="#collection"
              className="text-sm text-white/70 transition hover:text-white"
            >
              Collection
            </a>

            {user && (
              <a
                href="#wishlist"
                className="text-sm text-white/70 transition hover:text-white"
              >
                Wishlist
              </a>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {user ? (
              <>
                <button
                  onClick={() => setShowShoeForm(true)}
                  className="shrink-0 rounded-xl bg-blue-500 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-400 sm:px-4 sm:text-sm"
                >
                  + Add Shoe
                </button>

                <button
                  onClick={handleLogout}
                  className="shrink-0 rounded-xl border border-white/10 px-2.5 py-2 text-xs text-white/70 transition hover:border-white/20 hover:text-white sm:px-4 sm:text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                Login
              </button>
            )}
          </div>

        </div>
      </nav>

      {/* =========================
          HERO
      ========================== */}
      <main id="home">

        <section className="mx-auto max-w-7xl px-5 pb-14 pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">

            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-blue-400">
                Personal Shoe Collection
              </p>

              <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Your personal
                <span className="block text-blue-400">
                  sneaker space.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/55">
                A premium space to showcase your shoes,
                keep track of your collection and share your
                favorite pairs with everyone.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {user && (
                  <>
                    <button
                      onClick={() => setShowShoeForm(true)}
                      className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold transition hover:bg-blue-400"
                    >
                      Add to Collection
                    </button>

                    <button
                      onClick={() => setShowWishlistForm(true)}
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:text-white"
                    >
                      Add to Wishlist
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-[#0d1b35] p-6">
                <p className="text-sm text-white/50">
                  Total Shoes
                </p>
                <p className="mt-2 text-4xl font-bold">
                  {shoes.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0d1b35] p-6">
                <p className="text-sm text-white/50">
                  Wishlist Items
                </p>
                <p className="mt-2 text-4xl font-bold">
                  {user ? wishlist.length : '—'}
                </p>
              </div>

              <div className="col-span-2 rounded-2xl border border-white/10 bg-[#0d1b35] p-6">
                <p className="text-sm text-white/50">
                  Website
                </p>
                <p className="mt-2 text-xl font-semibold tracking-wide">
                  SOLESPACE
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* =========================
            COLLECTION
        ========================== */}
        <section
          id="collection"
          className="mx-auto max-w-7xl px-5 py-12"
        >
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-blue-400">
                Collection
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                My Shoes
              </h2>

              <p className="mt-2 text-sm text-white/50">
                Everyone can view and rate the collection.
              </p>
            </div>

            <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/50">
              {shoes.length} shoes
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d1b35] p-10 text-center text-white/50">
              Loading collection...
            </div>
          ) : shoes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d1b35]/50 p-10 text-center">
              <div className="text-5xl">👟</div>
              <p className="mt-4 text-white/60">
                No shoes added yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shoes.map((shoe) => (
                <ShoeCard
                  key={shoe.id}
                  shoe={shoe}
                  user={user}
                  ratingStats={
                    ratingStats[String(shoe.id)] || {
                      average: 0,
                      count: 0,
                    }
                  }
                  rated={
                    ratedShoes[String(shoe.id)]
                  }
                  onRate={submitRating}
                  onDelete={handleDeleteShoe}
                  onEdit={openEditShoe}
                />
              ))}
            </div>
          )}
        </section>

        {/* =========================
            WISHLIST
        ========================== */}
        {user && (
          <section
            id="wishlist"
            className="mx-auto max-w-7xl px-5 py-12"
          >
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-blue-400">
                  Wishlist
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  Shoes I Want
                </h2>
              </div>

              <button
                onClick={() => setShowWishlistForm(true)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
              >
                + Add
              </button>
            </div>

            {wishlist.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d1b35]/50 p-10 text-center">
                <div className="text-5xl">❤️</div>

                <p className="mt-4 text-white/60">
                  Your wishlist is empty.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {wishlist.map((shoe) => (
                  <WishlistCard
                    key={shoe.id}
                    shoe={shoe}
                    onDelete={handleDeleteWishlist}
                    onMove={moveToCollection}
                  />
                ))}
              </div>
            )}
          </section>
        )}

      </main>

      {/* =========================
          ADD SHOE MODAL
      ========================== */}
      {showShoeForm && (
        <Modal
          title="Add New Shoe"
          onClose={() => setShowShoeForm(false)}
        >
          <form
            onSubmit={handleAddShoe}
            className="space-y-4"
          >
            <Input
              label="Brand"
              value={shoeForm.brand}
              onChange={(e) =>
                setShoeForm({
                  ...shoeForm,
                  brand: e.target.value,
                })
              }
              placeholder="Nike"
            />

            <Input
              label="Model"
              value={shoeForm.model}
              onChange={(e) =>
                setShoeForm({
                  ...shoeForm,
                  model: e.target.value,
                })
              }
              placeholder="Air Jordan 1"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price ($)"
                type="number"
                value={shoeForm.price}
                onChange={(e) =>
                  setShoeForm({
                    ...shoeForm,
                    price: e.target.value,
                  })
                }
                placeholder="150"
              />

              <Input
                label="Size"
                value={shoeForm.size}
                onChange={(e) =>
                  setShoeForm({
                    ...shoeForm,
                    size: e.target.value,
                  })
                }
                placeholder="42"
              />
            </div>

            <Input
              label="Purchase Date"
              type="date"
              value={shoeForm.date}
              onChange={(e) =>
                setShoeForm({
                  ...shoeForm,
                  date: e.target.value,
                })
              }
            />

            <div>
              <label className="mb-2 block text-sm text-white/70">
                Shoe Photo
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setShoeImageFile(
                    e.target.files?.[0] || null
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-[#050d1d] p-3 text-sm text-white/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">
                Notes
              </label>

              <textarea
                value={shoeForm.notes}
                onChange={(e) =>
                  setShoeForm({
                    ...shoeForm,
                    notes: e.target.value,
                  })
                }
                placeholder="Tell something about this shoe..."
                rows="3"
                className="w-full rounded-xl border border-white/10 bg-[#050d1d] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-400/50"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-500 py-3 font-semibold transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Shoe'}
            </button>
          </form>
        </Modal>
      )}

      {/* =========================
          EDIT SHOE MODAL
      ========================== */}
      {showEditForm && editingShoe && (
        <Modal
          title="Edit Shoe"
          onClose={() => {
            setShowEditForm(false)
            setEditingShoe(null)
            setEditImageFile(null)
          }}
        >
          <form
            onSubmit={handleEditShoe}
            className="space-y-4"
          >
            <Input
              label="Brand"
              value={editForm.brand}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  brand: e.target.value,
                })
              }
              placeholder="Nike"
            />

            <Input
              label="Model"
              value={editForm.model}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  model: e.target.value,
                })
              }
              placeholder="Air Jordan 1"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price ($)"
                type="number"
                value={editForm.price}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    price: e.target.value,
                  })
                }
                placeholder="150"
              />

              <Input
                label="Size"
                value={editForm.size}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    size: e.target.value,
                  })
                }
                placeholder="42"
              />
            </div>

            <Input
              label="Purchase Date"
              type="date"
              value={editForm.date}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  date: e.target.value,
                })
              }
            />

            <div>
              <label className="mb-2 block text-sm text-white/70">
                Replace Shoe Photo
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setEditImageFile(
                    e.target.files?.[0] || null
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-[#050d1d] p-3 text-sm text-white/60"
              />

              <p className="mt-2 text-xs text-white/35">
                Leave this empty to keep the current photo.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">
                Notes
              </label>

              <textarea
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    notes: e.target.value,
                  })
                }
                placeholder="Tell something about this shoe..."
                rows="3"
                className="w-full rounded-xl border border-white/10 bg-[#050d1d] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-400/50"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-500 py-3 font-semibold transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </form>
        </Modal>
      )}

      {/* =========================
          WISHLIST MODAL
      ========================== */}
      {showWishlistForm && (
        <Modal
          title="Add to Wishlist"
          onClose={() => setShowWishlistForm(false)}
        >
          <form
            onSubmit={handleAddWishlist}
            className="space-y-4"
          >
            <Input
              label="Brand"
              value={wishlistForm.brand}
              onChange={(e) =>
                setWishlistForm({
                  ...wishlistForm,
                  brand: e.target.value,
                })
              }
              placeholder="Nike"
            />

            <Input
              label="Model"
              value={wishlistForm.model}
              onChange={(e) =>
                setWishlistForm({
                  ...wishlistForm,
                  model: e.target.value,
                })
              }
              placeholder="Air Jordan 4"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price ($)"
                type="number"
                value={wishlistForm.price}
                onChange={(e) =>
                  setWishlistForm({
                    ...wishlistForm,
                    price: e.target.value,
                  })
                }
                placeholder="200"
              />

              <Input
                label="Size"
                value={wishlistForm.size}
                onChange={(e) =>
                  setWishlistForm({
                    ...wishlistForm,
                    size: e.target.value,
                  })
                }
                placeholder="42"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">
                Shoe Photo
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setWishlistImageFile(
                    e.target.files?.[0] || null
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-[#050d1d] p-3 text-sm text-white/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">
                Notes
              </label>

              <textarea
                value={wishlistForm.notes}
                onChange={(e) =>
                  setWishlistForm({
                    ...wishlistForm,
                    notes: e.target.value,
                  })
                }
                placeholder="Why do you want this shoe?"
                rows="3"
                className="w-full rounded-xl border border-white/10 bg-[#050d1d] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-400/50"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-500 py-3 font-semibold transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : 'Add to Wishlist'}
            </button>
          </form>
        </Modal>
      )}

      {/* =========================
          LOGIN MODAL
      ========================== */}
      {showLogin && (
        <Modal
          title="Welcome Back"
          onClose={() => setShowLogin(false)}
        >
          <Auth
            onLogin={(loggedUser) => {
              setUser(loggedUser)
              setShowLogin(false)
            }}
          />
        </Modal>
      )}

      {/* =========================
          FOOTER
      ========================== */}
      <footer className="border-t border-white/10 px-5 py-8 text-center text-sm text-white/35">
        © {new Date().getFullYear()} SOLESPACE. All rights reserved.
      </footer>
    </div>
  )
}

/* =========================
   MODAL
========================= */

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0d1b35] p-6 shadow-2xl">

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-white/20 hover:text-white"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

/* =========================
   INPUT
========================= */

function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-white/70">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-[#050d1d] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-400/50"
      />
    </div>
  )
}

/* =========================
   SHOE CARD
========================= */

function ShoeCard({
  shoe,
  user,
  ratingStats,
  rated,
  onRate,
  onDelete,
  onEdit,
}) {
  const isOwner =
    user && user.id === shoe.owner_id

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0d1b35] transition duration-300 hover:-translate-y-1 hover:border-blue-400/20">

      <ShoeImage
        src={shoe.image_url}
        alt={`${shoe.brand} ${shoe.model}`}
      />

      <div className="p-5">

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-blue-400">
              {shoe.brand}
            </p>

            <h3 className="mt-1 text-xl font-semibold">
              {shoe.model}
            </h3>
          </div>

          {isOwner && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onEdit(shoe)}
                className="text-xs text-blue-400/80 transition hover:text-blue-300"
              >
                Edit
              </button>

              <button
                onClick={() => onDelete(shoe.id)}
                className="text-xs text-red-400/70 transition hover:text-red-400"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 space-y-3 text-sm">

          <div className="flex justify-between">
            <span className="text-white/50">
              Price
            </span>

            <span className="font-semibold">
              ${Number(shoe.price).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/50">
              Size
            </span>

            <span>{shoe.shoe_size}</span>
          </div>

          {shoe.purchase_date && (
            <div className="flex justify-between">
              <span className="text-white/50">
                Purchased
              </span>

              <span>
                {shoe.purchase_date}
              </span>
            </div>
          )}

        </div>

        {shoe.notes && (
          <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-white/50">
            {shoe.notes}
          </p>
        )}

        {/* RATING */}
        <div className="mt-5 border-t border-white/10 pt-4">

          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50">
              Rating
            </span>

            {ratingStats.count > 0 ? (
              <span className="text-sm">
                ⭐ {ratingStats.average.toFixed(1)}
                <span className="ml-1 text-white/40">
                  ({ratingStats.count})
                </span>
              </span>
            ) : (
              <span className="text-xs text-white/30">
                No ratings yet
              </span>
            )}
          </div>

          <div className="mt-4">

            {isOwner ? (
              <p className="text-xs text-white/35">
                You own this shoe — owner rating is disabled.
              </p>
            ) : rated ? (
              <div className="rounded-xl bg-blue-500/10 px-4 py-3 text-center text-xs text-blue-300">
                ✓ You rated this shoe {rated}/5
              </div>
            ) : (
              <>
                <p className="mb-2 text-xs text-white/40">
                  Rate this shoe
                </p>

                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((number) => (
                    <button
                      key={number}
                      onClick={() =>
                        onRate(shoe.id, number)
                      }
                      className="flex-1 rounded-lg border border-white/10 bg-[#050d1d] py-2 text-sm transition hover:border-blue-400/40 hover:bg-blue-500/10"
                    >
                      {number}★
                    </button>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}

/* =========================
   WISHLIST CARD
========================= */

function WishlistCard({
  shoe,
  onDelete,
  onMove,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1b35]">

      <ShoeImage
        src={shoe.image_url}
        alt={`${shoe.brand} ${shoe.model}`}
      />

      <div className="p-5">

        <p className="text-xs uppercase tracking-[0.15em] text-blue-400">
          {shoe.brand}
        </p>

        <h3 className="mt-1 text-xl font-semibold">
          {shoe.model}
        </h3>

        <div className="mt-5 flex justify-between text-sm">
          <span className="text-white/50">
            Price
          </span>

          <span className="font-semibold">
            ${Number(shoe.price).toFixed(2)}
          </span>
        </div>

        <div className="mt-2 flex justify-between text-sm">
          <span className="text-white/50">
            Size
          </span>

          <span>{shoe.shoe_size}</span>
        </div>

        {shoe.notes && (
          <p className="mt-4 text-sm leading-6 text-white/50">
            {shoe.notes}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onMove(shoe)}
            className="flex-1 rounded-xl bg-blue-500 px-3 py-2 text-xs font-semibold transition hover:bg-blue-400"
          >
            Move to Collection
          </button>

          <button
            onClick={() => onDelete(shoe.id)}
            className="rounded-xl border border-red-400/20 px-3 py-2 text-xs text-red-400 transition hover:bg-red-400/10"
          >
            Delete
          </button>
        </div>

      </div>
    </div>
  )
}

/* =========================
   IMAGE
========================= */

function ShoeImage({ src, alt }) {
  const [imageError, setImageError] = useState(false)

  if (!src || imageError) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-[#08152b] text-6xl">
        👟
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImageError(true)}
      className="aspect-[4/3] w-full object-cover"
    />
  )
}

/* =========================
   AUTH
========================= */

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      alert('Please enter email and password.')
      return
    }

    try {
      setBusy(true)

      if (mode === 'login') {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          })

        if (error) {
          alert(error.message)
          return
        }

        if (data.user) {
          onLogin(data.user)
        }
      } else {
        const { data, error } =
          await supabase.auth.signUp({
            email,
            password,
          })

        if (error) {
          alert(error.message)
          return
        }

        if (data.session && data.user) {
          onLogin(data.user)
        } else {
          alert(
            'Account created. Please check your email to confirm your account, then login.'
          )

          setMode('login')
        }
      }
    } catch (error) {
      console.error(error)
      alert('Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-blue-500 py-3 font-semibold transition hover:bg-blue-400 disabled:opacity-50"
        >
          {busy
            ? 'Please wait...'
            : mode === 'login'
            ? 'Login'
            : 'Create Account'}
        </button>
      </form>

      <button
        onClick={() =>
          setMode(
            mode === 'login'
              ? 'signup'
              : 'login'
          )
        }
        className="mt-5 w-full text-center text-sm text-white/50 transition hover:text-blue-400"
      >
        {mode === 'login'
          ? "Don't have an account? Create one"
          : 'Already have an account? Login'}
      </button>

    </div>
  )
}

export default App