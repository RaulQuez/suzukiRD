/*
    Main dashboard page for admin app 
    displays: 
     - search bar to filter by name
     - category filter buttons
     - add product button to open a form
     - edit and delete actions on each row

     Data Flow: 
    1. On mount, fetch all products from GET /api/products
    2. Display them in a table
    3. Admin can search/filter — filtered client-side, no extra API calls
    4. Add → opens modal → POST /api/products → refresh list
    5. Edit → opens modal pre-filled → PATCH /api/products/:id → refresh list
    6. Delete → confirm → DELETE /api/products/:id → refresh list
*/
import { useState, useEffect, useMemo } from "react";
import api from "../api/axios"
import "../App.css"

// categories
const CATEGORIES = [
    "Air Intake Systems",
    "Clutch Drive Lines",
    "Engine Parts",
    "Engine-Crate Engines",
    "Exhaust Systems",
    "Fuel and Ignition",
    "Suspension and Brakes",
    "Turbos and Components",
];
// empty form (default state for add/edit modal form) defined outside component so its not recreated on every render. 
const EMPTY_FORM = {
    name: "",
    category: "",
    price: "",
    stock: "",
    description: "",
    imageUrl: "",
    variants: [],
    length: "",
    weight: "",
    width: "",
    height: "",
};

const ProductsPage = () => {

    // products - full lsit fetched from api - never modified directly only replaced when fetch
    const [products, setProducts] = useState([]);

    // loading/error
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // search - admin typed in search bar
    const [search, setSearch] = useState("");
    // activeCategory - category button filter is selected - we default as ALL
    const [activeCategory, setActiveCategory] = useState("All");
    // modalOpen controls whether to add/edit modal is visible
    const [modalOpen, setModalOpen] = useState(false);
    // editingProduct - product is being edited or null if adding a new product
    const [editingProduct, setEditingProduct] = useState(null);
    // form is the current values of the modal form inputs
    const [form, setForm] = useState(EMPTY_FORM);
    // formError & formLoading is the feedback during form submission
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);
    // imageUploading - true while image is being sent to cloudinary, disables the file input so the admin cant pick another file mid-upload
    const [imageUploading, setImageUploading] = useState(false);
    
    /* imagePublicId - stores the cloudinary public_id of the currently uploaded image.
        need this to delete the old image from Cloudinary
        when the admin removes it or replaces it.
        Only set for images uploaded in this session — not for existing imageUrls
        from the database (we don't store publicId in the Product model).
    */
   const [imagePublicId, setImagePublicId] = useState("");

    // fetch products with api and store them in products state. called on mount and after any create/update/delete operation to keep table in sync
    // defined withconst inside component so it has access to setPRoducts, setLoading,setError on closure
    const fetchProducts = async () => {
        try {
            setLoading(true);
            setError("");

            // api.get("/products") hits GET /api/products and axios automatically parses JSON response, response.datais already a JS array of products
            const response = await api.get("/products");
            setProducts(response.data);

        } catch (err) {
            setError("Failed to load products. Is the server running?");
            console.error(err);
        } finally {
            setLoading(false);
        };
    };

        /*
        useEffect with [] runs fetchProducts once when component first mounts. Empty array means no dependencies so it will never re run
        automatically after that. manually we call fetchProducts() after add/edit/delete
        */
    useEffect(() => {
        fetchProducts();
       }, []);

       /*
       React Hook useMemo - computes filterProducts only when products, search, or activeCategory changes (dependency array). Skips the computation on re-renders caused by unrelatedstate changes like modalOpen
        Without useMemo, the filter would re-run on EVERY render —
        including when the modal opens/closes, which is wasteful
        with hundreds of products.

        The filter chain:
        1. Filter by category if one is selected
        2. Filter by search term against name and category 

        return products.filter(...).filter(...)
       */
      const filteredProducts = useMemo(() => {
        // filter 1 by category
        return products.filter((p) => {
            // if activeCategory is "All" include everything otherwise only include products matching the selected category
            if (activeCategory === "All") return true;
            
            // if activeCategory is not all
            return p.category === activeCategory;
        })
        // filter 2 by search term
        .filter((p) => {
            // if search is empty, include everything. otherwise check if name or category contains search term, turbo matches turbo inlet pipe
            if (!search.trim()) return true;

            const term = search.toLowerCase();
            // .includes - js string method returns true if string contains substring
            return (p.name.toLowerCase().includes(term) || 
                    p.category.toLowerCase().includes(term));
        });
      }, [products, search, activeCategory]);
    
      // openAddModal resets the form to empty and opens modal in "add" mode. editingProduct = null signals to handlesubmit that is a POST not a PATCH
      const openAddModal = () => {
        setEditingProduct(null);
        setForm(EMPTY_FORM);
        setFormError("");
        setImagePublicId("");
        setModalOpen(true);
      };
      // openEditModal prefills the form with products current values and ppens the modal in edit mode
      // editingProduct = product object signals to handleSunmit that this is a PATCH not POST
      // String(product.price) converts number to a string, form inputs always work with strings we convert back to a number when submiting
      const openEditModal = (product) => {
        setEditingProduct(product);
        setForm({
            name: product.name,
            category: product.category,
            price:  String(product.price),
            stock: String(product.stock),
            description: product.description || "",
            imageUrl: product.imageUrl || "",
            // transforms raw variant strings from database into structured objects
            variants: product.variants?.length ? product.variants.map(v => {
                const [name, ...opts] = v.split(":");
                return { name: name?.trim() || "", options: opts.join(":").trim() || ""};
            }) : [],  
            length: String(product.dimensions?.length || ""),
            weight: String(product.weight || ""),
            width: String(product.dimensions?.width || ""),
            height: String(product.dimensions?.height || ""),
        });

        setFormError("");
        setImagePublicId("");
        setModalOpen(true);
      };
      
      // closeModal - hides the modal and resets all form states, called when the admin clicks cancel or X
      const closeModal = () => {
        setModalOpen(false);
        setEditingProduct(null);
        setForm(EMPTY_FORM);
        setFormError("");
      };

      /*
      handleFormChange - single handler for all form inputs so instead of writing a seperate onChange handler for each field we use the input's
      name attribute to know which field to update.

      e.target.name - name attribute on the input ("price", "stock", ect.)
      e.target.value - what admin typed

        The spread ...prev keeps all existing form values,
        then [e.target.name]: e.target.value overwrites just the one that changed.
        [e.target.name] is computed property syntax — the brackets let us
        use a variable as the key name instead of a literal string.
      */
      const handleFormChange = (e) => {
        setForm((prev) => ({
            ...prev, [e.target.name]: e.target.value,
        }));
      };

      // handleSubmit handles both add and exit form submissions, decides POST vs PATCH based on editingProduct state
      const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        setFormLoading(true);

        try {
            // build payload - convert price and stock from strings (form input always return strings) back to numbers by Number().
            const payload = {
                name: form.name.trim(),
                category: form.category,
                price: Number(form.price),
                stock: Number(form.stock),
                description: form.description.trim(),
                imageUrl: form.imageUrl.trim() || null,
                variants: form.variants.filter(v => v.name.trim() && v.options.trim()).map(v => `${v.name.trim()}:${v.options.trim()}`),
                weight: Number(form.weight) || 0,
                dimensions: {
                    length: Number(form.length) || 0,
                    width: Number(form.width) || 0,
                    height: Number(form.height) || 0,
                }
            };

            if (editingProduct) {
                // edit mode - PATCH/api/products/:id, editingProduct._id is MnongoDB document id. Axios puts the payload as the request body
                await api.patch(`/products/${editingProduct._id}`, payload);
            } else {
                // Add mode - POST /api/products
                await api.post("/products", payload);
            }
            // on success close modal & refetch the full list so table reflects change
            closeModal(true);
            fetchProducts();
        } catch (err) {
            setFormError(err.response?.data.error || "Something went wrong");
        } finally {
            setFormLoading(false);
        }
      };
      /* handleDelete - asks for confirmation to delete the product

        window.confirm() shows the browser's built-in confirmation dialog.
        It returns true if the admin clicked OK, false if they clicked Cancel.
        This is a quick and simple way to prevent accidental deletes
        without building a custom confirmation modal.
        We can replace this with a proper modal later.
      */
    const handleDelete = async (product) => {
        const confirmed = window.confirm(
            `Delete "${product.name}"? This operation cannot be undone.`
        );
        if (!confirmed) return;
     try {
        await api.delete(`/products/${product._id}`);
        // optimistic update — remove from local state instantly without refetching
        setProducts((prev) =>
            prev.filter((p) => p._id !== product._id)
        );
    } catch (err) {
        alert(err.response?.data?.error || "Failed to delete product");
    }
};
    // handleImageUpload - fires when the admin picks a file.
    // Sends it to POST /api/product/upload-image and stores the returned URL.
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];

        if (!file) return;

        setImageUploading(true);

        try {
        /*
            formData is the browser's way of sending fioles in HTTP requests. Regular JSON can't
            contain binary file data - FormData can. append("image", file) - "image" must match the field
            multer expect: upload.single("image") in the route
        */
       const formData = new FormData();
       formData.append("image", file);

       // when sending FormData, dont set Content-Type manually. The browser sets it automatically to multipart/form-data
       // with the correct boundary string. Setting it manually breaks it.
       const response = await api.post("/products/upload-image", formData);

       /*
            Store the Cloudinary URL in form state so it gets included when the product is saved, store the publicId seperately
            so we can delete the image from Cloudinary if needed.
       */
      setForm((prev) => ({...prev, imageUrl: response.data.url}));
      setImagePublicId(response.data.imagePublicId);
        } catch (err) {
            alert(err.response?.data?.error || "Image upload failed.");
        } finally {
            setImageUploading(false);
        }
};

    // handleImageRemove - clears the image from the form and deletes it from Cloudinary if it was uploaded this session
    const handleImageRemove = async () => {
        // only deletes from cloudinary if we have a publicId, if the admin is editing an existing product, imagePublicId is empty (we dont store in the DB) we just clear URL from the form without touching cloudinary
        if (imagePublicId) {
            try {
                await api.delete("/products/image", {
                    data: { publicId: imagePublicId },
                });
            } catch (err) {
                console.error("Failed to delete image from Cloudinary", err);
            }
        }
        setForm((prev) => ({ ...prev, imageUrl: "" }));
        setImagePublicId("");
    };

    // flips a product between active (visible) and inactive (hidden from shop)
    const handleToggleActive = async (product) => {
    try {
        await api.patch(`/products/${product._id}`, { isActive: !product.isActive });
        fetchProducts(); // re-pull the list so the badge/button update
    } catch (err) {
        alert(err.response?.data?.error || "Failed to update visibility");
    }
    };
     

     return (
        <div className="products-page">

            {/** products page header */}
            <div className="products-page-header">
                <div>
                    <h1 style={{fontSize: 20, fontWeight: 550, color: "red"}}>Products</h1>
                    <p style={{fontWeight: 400}}>{products.length} total products</p>
                </div>

                <button className="add-product-btn" onClick={openAddModal}>
                    + Add Product
                </button>
            </div>

            {/** Search bar */}
        <input className="product-search-bar"
        type="text"
        placeholder="Search by name or category"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        />
        {/** category filter buttons */}
        <div style={{display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, padding: 10,}}>
            {/** "all" is prepended before the categories array, clicking it resets the category filter */}
            {["All", ...CATEGORIES].map((cat) => (
                <button 
                key={cat}
                className="filter-btns"
                style={{padding: 5, borderRadius: 5, border: "0.5px solid #2a2a2a", background: "none", color: "#888", cursor: "pointer", fontSize: 17, transition: "all 0.15s", margin: 3, fontWeight: 600}}
                onClick={() => setActiveCategory(cat)}>
                    {cat}
                </button>
            ))}
        </div>

        {/** States: loading / error / empty/ table */}
        {loading ? (
            <div className="state-msg">Loading Products...</div>
        ) : error ? (
            <div className="state-msg">{error}</div>
        ) : filteredProducts.length === 0 ? (
            <div className="state-msg">No products found.</div>
        ) : (
            // table wrapper
            <div style={{background: "#1a1a1a", border: "0.5px solid black", borderRadius: 12, overflow:"hidden",}}>
                {/** products table
                 * table - outer container that wraps everything
                 * table head thead - contains the column header row
                 * table row trow - each row in the table
                 * table body tbody - body of the table
                 * table header th
                 */}
                <table className="products-table">
                <thead>
                    <tr>
                        <th>Image</th> 
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                    </tr>
                </thead>
        <tbody>
            {filteredProducts.map((product) => (
                <tr key={product._id}>
                    <td>
                        {product.imageUrl ? (
                            <img 
                            src={product.imageUrl}
                            alt={product.name}
                            className="product-img"
                            /> 
                        ) : (<div style ={{width:40, height: 40, borderRadius: 6, background:"#222", border: "0.5px solid #2a2a2a"}}></div>)}
                    </td>

                    <td className="product-name">{product.name}  
                    </td>
                    
                    <td>
                        <span className="category-badge">{product.category}</span>
                    </td>    

                    <td>${product.price.toFixed(2)}</td>
                    
                    <td>
                        <span className={
                            product.stock === 0 ? "product-stock-zero" : product.stock < 3 ? "product-stock-low" : ""
                        }>
                            {product.stock}
                        </span>
                    </td>

                <td className="actions-cell">
                    <button className="edit-btn" onClick={() => openEditModal(product)}>
                        Edit
                    </button>

                    <button className="delete-btn" onClick={() => handleDelete(product)}>
                        Delete
                    </button>

                     <button
                     style={{marginLeft: 6}}
                    className={`edit-btn ${product.isActive !== false ? "toggle-hide" : "toggle-show"}`}
                    onClick={() => handleToggleActive(product)}>
                    {product.isActive !== false ? "Hide" : "Show"}
                    </button>
                </td>
            </tr>
            ))}
        </tbody>
     </table>
    </div>
)}

{/** Add/Edit Modals.
 * 
 * Only render the modal when modalOpen is true && short-circuits if false nothing renders.
 * This also means the form full unmounts and remounts each time which naturally resets any internal state.
 */}
 {modalOpen && (
    // modal overlay covers entire screen with dark semi-transparent background and clicking it closes the modal
    <div className="modal-overlay" onClick={closeModal}>
        {/**
           e.stopPropagation() prevents clicks INSIDE the modal
                from bubbling up to the overlay and closing it.
                Without this, clicking anywhere inside the form
                would trigger the overlay's onClick and close it.
         */}
        <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h2 className="modal-title">
            {editingProduct ? "Edit Product" : "Add Product"}
                </h2>
                <button className="modal-close" onClick={closeModal}>
                    X
                </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">

                <div className="form-group">
                    <input 
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="Product name"
                    required
                    />
                </div>

                <div className="form-group">
                    <label>Category</label>

                    {/** <select> renders a dropdown.  
                    The first option is a disabled placeholder —
                    it shows "Select category" but can't be chosen.
                    required on the select means the form won't
                    submit if the placeholder is still selected.
                    */}

                    <select 
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    required
                    >
                        <option value="" disabled>
                            Select Category
                        </option>
                        {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>

                {/** 2 inputs side by side using a grid.
                 * price & stock naturally belond together
                 */}
                 <div className="form-row">
                    <div className="form-group">
                        <label style={{fontSize: 14}}>Price ($)</label>
                        <input 
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={handleFormChange}
                        placeholder="0.00"
                        required />
                    </div>

                    <div className="form-group">
                        <label style={{fontSize: 14}}>Stock</label>
                        <input
                        name="stock"
                        type="number"
                        min="0"
                        step="1"
                        value={form.stock}
                        onChange={handleFormChange}
                        placeholder="0"
                        required />
                    </div>
                 </div>
                 
                 <div className="form-group">
                    <label>Description</label>
                    {/*
                    <textarea> is a multi-line text input.
                    rows={3} sets the visible height.
                    resize: vertical in CSS lets the admin
                    drag it taller if needed.
                    */}
                    <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Product Description...."
                    rows={3}
                    />
                 </div>

                 {/** variants input for modal form */}
        <div className="form-group">
    <label>Variants / Sizes / Specs</label>
        {form.variants.map((variant, index) => (
            
            <div key={index} style={{
                display: "flex", gap: 8, marginBottom: 10, background: "#111", border: "0.5px solid #2a2a2a",
                borderRadius: 8, padding: 10, flexDirection: "column",}}>
            {/** header row : variant name and remove button */}
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                    <input placeholder="Variant Name: (e.g. size, engine type)"
                        value={variant.name}
                        onChange={(e) => {
                        const updated = [...form.variants];
                        updated[index] = {...updated[index], name: e.target.value};
                        setForm(prev => ({...prev, variants: updated }));
                        }} 
                        style={{flex: 1, marginRight: 8, background: "#1a1a1a", border: "0.5px solid #333", color: "white",
                            borderRadius: 6, padding: "6px 10px", fontSize: 13,
                        }} />

                        <button onClick={() => {
                            const updated = form.variants.filter(((_, i) => i !== index));
                            setForm(prev => ({...prev, variants: updated }));
                        }}
                         style={{background: "none", border: "none", color: "#e57373",
                        cursor: "pointer", fontSize: 18, lineHeight: 1}}>
                            ✕
                        </button>
                </div>

                {/** options input */}
                <input placeholder="Options, comma seperated (e.g 2.5 inch, 3 inch, 3.5 inch)"
                value={variant.options}
                onChange={(e) => {
                    const updated = [...form.variants];
                    updated[index] = { ...updated[index], options: e.target.value };
                    setForm(prev => ({ ...prev, variants: updated }));
                }}
                style={{background: "#1a1a1a", border: "0.5px solid #333",
                    color: "white", borderRadius: 6, padding: "6px 10px", fontSize: 13}} />

                {/** preview of options */}
                {variant.options && (
                    <div style={{display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4}}>
                {variant.options.split(",").map((opt, i) => 
                opt.trim() && (
                    <span key={i} style={{fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#2a1010", color: "white", 
                        border: "0.5px solid #5a1a1a"}}>{opt.trim()}</span>
                )
                )}
                    </div>
                )}
            </div>
            
        ))}
            {/* Add variant group button */}
    <button type="button"
        onClick={() => setForm(prev => ({
            ...prev,
            variants: [...prev.variants, { name: "", options: "" }]
        }))}
        style={{marginTop: 4, background: "none", borderRadius: 8, padding: "8px 16px",
            cursor: "pointer", fontSize: 13, width: "100%",}}
            className="variant-btn">
        + Add Variant Group
    </button>


        </div>
                
                {/**** Shipping Info - weight and dimensions ****/}
                <div style={{paddingTop: 14, borderTop: "1px solid #222"}}>
                    <div className="form-group">
                        
                    <label>Shipping Info</label>
                    {/**weight */}
                    <div className="form-group">
                        <label>Weight (lbs)</label>
                        <input
                        name="weight"
                        type="number"
                        min="0" 
                        step="0.01"
                        value={form.weight}
                        onChange={handleFormChange}
                        placeholder="0"
                         />
                         
                    </div>
                    {/** dimensions 3 frames for 3 inputs, height, width, length */}
                    <div className="form-group" style={{gridTemplateColumns: "1fr 1fr 1fr" }}>  
                    <label>Length (inches)</label>
                    <input
                    name="length"
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.length}
                    onChange={handleFormChange}
                    placeholder="0"
                    />
                    </div>
                    <div className="form-group">
                        <label>Width (inches)</label>
                        <input
                            name="width"
                            type="number"
                            min="0"
                            step="0.1"
                            value={form.width}
                            onChange={handleFormChange}
                            placeholder="0"
                        />
                    </div>
                    <div className="form-group">
                        <label>Height (inches)</label>
                        <input
                            name="height"
                            type="number"
                            min="0"
                            step="0.1"
                            value={form.height}
                            onChange={handleFormChange}
                            placeholder="0"
                        />
                    </div>
                </div>
            </div>

                 <div className="form-group">
                    <label>Product Image</label>
                    {/** If an image URL exists show the preview, otherwise show upload button (choose image button) */}
                    {form.imageUrl ? (
                        // wrapper 
                        <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                            <img 
                            src={form.imageUrl}
                            alt="Product Preview"
                            className="image-preview"
                        />
                    {/**remove button clears the imageUrl from form state & deletes image from cloud if it was just uploaded
                     * (has a publicId stored in imagePublicId)
                     */}
                     <button
                     type="button"
                     className="image-remove-btn"
                     onClick={() => handleImageRemove()}>✕ Remove</button>
                        </div>
                    ) : (
                        // image upload label
                        <label className="image-upload-label"> {imageUploading ? (<span>Uploading ...</span>) : (<span>📁 Choose image</span>)} 
                        
                        {/** The actual file input is hidden */}
                        <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{display: "none"}}
                        onChange={handleImageUpload}
                        disabled={imageUploading}
                        />
                        </label>
                    ) }
                 </div>
                {formError && (
                    <div className="form-error">{formError}</div>
                )}

                <div className="modal-actions">
                    <button 
                    type="button"
                    className="cancel-submit-btn"
                    onClick={closeModal}>
                        Cancel
                    </button>

                    <button
                    type="submit"
                    className="cancel-submit-btn"
                    disabled={formLoading}>
                        {formLoading
                        ? "Saving..."
                    : editingProduct
                    ? "Save Changes"
                    : "Add Product"}
                    </button>
                </div>
            </form>
        </div>
    </div>
 )}
        </div>
     );
};   
export default ProductsPage;