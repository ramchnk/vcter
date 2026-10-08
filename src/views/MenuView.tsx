import React, { useState, useMemo, useRef } from 'react';
import { useApp, MenuItem, RecipeItem } from '../context/AppContext';
import { 
  Search, 
  Plus, 
  Upload, 
  X, 
  UtensilsCrossed, 
  Wine, 
  ArrowUpDown, 
  CheckSquare, 
  Square, 
  Trash2, 
  Edit3, 
  MoreVertical, 
  Sparkles, 
  Check, 
  Image as ImageIcon,
  ChefHat,
  Filter,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Boxes,
  Droplets,
  Layers,
  Scale,
  Package
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Pre-curated high-res images for common hotel items
const SAMPLE_IMAGE_PRESETS: { name: string; url: string; dietary: 'Veg' | 'Non-Veg' | 'Drinks'; isBar: boolean; category: string }[] = [
  { name: '1L Water Bottle (Aquafina)', url: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=400&q=80', dietary: 'Drinks', isBar: false, category: 'Beverages' },
  { name: '200ML Cold Drinks (Pepsi/Coke)', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80', dietary: 'Drinks', isBar: false, category: 'Beverages' },
  { name: 'Apple Fruit Salad', url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80', dietary: 'Veg', isBar: false, category: 'Starters' },
  { name: 'Black Sundal Special', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80', dietary: 'Veg', isBar: false, category: 'Starters' },
  { name: 'Boiled Egg (2 Pcs)', url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=400&q=80', dietary: 'Non-Veg', isBar: false, category: 'Starters' },
  { name: 'Boiled Peanut Masala', url: 'https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=400&q=80', dietary: 'Veg', isBar: false, category: 'Starters' },
  { name: 'Paneer Butter Masala', url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80', dietary: 'Veg', isBar: false, category: 'Main Course' },
  { name: 'Chicken Biryani Special', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80', dietary: 'Non-Veg', isBar: false, category: 'Main Course' },
  { name: 'Mojito Cocktail Special', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80', dietary: 'Drinks', isBar: true, category: 'Cocktails' },
  { name: 'Craft Chilled Beer', url: 'https://images.unsplash.com/photo-1608270119299-9b4dc36a89c9?auto=format&fit=crop&w=400&q=80', dietary: 'Drinks', isBar: true, category: 'Beer & Wine' },
  { name: 'Single Malt Whisky (30ml)', url: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=400&q=80', dietary: 'Drinks', isBar: true, category: 'Liquor' },
  { name: 'Chocolate Lava Cake', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80', dietary: 'Veg', isBar: false, category: 'Desserts' }
];

export const MenuView: React.FC = () => {
  const { 
    menuItems, 
    inventory,
    addMenuItem, 
    updateMenuItem, 
    deleteMenuItem, 
    batchDeleteMenuItems, 
    bulkAddMenuItems, 
    currentTenant 
  } = useApp();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'All' | 'Veg' | 'Non-Veg' | 'Drinks'>('All');
  const [outletFilter, setOutletFilter] = useState<'All' | 'Restaurant' | 'Bar'>('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState<'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'>('name-asc');
  
  // Selection mode & checked items
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form State matching screenshot
  const [formName, setFormName] = useState('');
  const [formIsBar, setFormIsBar] = useState(false); // The switch: Restaurant (false) vs Bar (true)
  const [formCategory, setFormCategory] = useState('None');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formDietary, setFormDietary] = useState<'Veg' | 'Non-Veg' | 'Drinks'>('Veg');
  const [formIsCombo, setFormIsCombo] = useState(false);
  const [formPrice, setFormPrice] = useState<string>('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImagePreview, setFormImagePreview] = useState('');
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recipe & Combo Stock Deduction State
  const [formRecipe, setFormRecipe] = useState<RecipeItem[]>([]);
  const [selectedInvId, setSelectedInvId] = useState('');
  const [recipeDeductType, setRecipeDeductType] = useState<'ml' | 'qty'>('qty');
  const [recipeQty, setRecipeQty] = useState('1');

  // Dropdown menu state
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Compute Categories from database + standard lists
  const availableCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    // Pre-populate standard categories
    ['Beverages', 'Starters', 'Main Course', 'Desserts', 'Cocktails', 'Beer & Wine', 'Liquor', 'Snacks'].forEach(c => categoriesSet.add(c));
    (menuItems || []).forEach(item => {
      if (item.category && item.category !== 'None') {
        categoriesSet.add(item.category);
      }
    });
    return Array.from(categoriesSet);
  }, [menuItems]);

  // Filtered & Sorted Menu Items
  const filteredItems = useMemo(() => {
    let result = (menuItems || []).filter(item => {
      if (!item) return false;
      
      // Search
      const term = searchTerm.toLowerCase().trim();
      if (term && !item.name.toLowerCase().includes(term) && !item.category?.toLowerCase().includes(term)) {
        return false;
      }

      // Dietary filter
      if (dietaryFilter !== 'All') {
        const itemDietary = item.dietary || (item.category === 'Beverages' || item.isBar ? 'Drinks' : 'Veg');
        if (itemDietary !== dietaryFilter) return false;
      }

      // Outlet filter (Restaurant vs Bar)
      if (outletFilter === 'Restaurant' && item.isBar) return false;
      if (outletFilter === 'Bar' && !item.isBar) return false;

      // Category filter
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'No Category' && item.category && item.category !== 'None') return false;
        if (selectedCategory !== 'No Category' && item.category !== selectedCategory) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'name-desc') return b.name.localeCompare(a.name);
      if (sortOrder === 'price-asc') return (a.price || 0) - (b.price || 0);
      if (sortOrder === 'price-desc') return (b.price || 0) - (a.price || 0);
      return 0;
    });

    return result;
  }, [menuItems, searchTerm, dietaryFilter, outletFilter, selectedCategory, sortOrder]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormIsBar(false);
    setFormCategory('None');
    setFormCustomCategory('');
    setFormDietary('Veg');
    setFormIsCombo(false);
    setFormPrice('');
    setFormImageUrl('');
    setFormImagePreview('');
    setFormRecipe([]);
    setSelectedInvId('');
    setRecipeDeductType('qty');
    setRecipeQty('1');
    setShowPresetPicker(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name || '');
    setFormIsBar(Boolean(item.isBar));
    setFormCategory(item.category || 'None');
    setFormCustomCategory('');
    setFormDietary(item.dietary || (item.category === 'Beverages' || item.isBar ? 'Drinks' : 'Veg'));
    setFormIsCombo(Boolean(item.isCombo));
    setFormPrice(String(item.price || 0));
    setFormImageUrl(item.imageUrl || '');
    setFormImagePreview(item.imageUrl || '');
    setFormRecipe(item.recipe || []);
    setSelectedInvId('');
    setRecipeDeductType('qty');
    setRecipeQty('1');
    setShowPresetPicker(false);
    setIsModalOpen(true);
  };

  // Add Recipe / Combo Item
  const handleAddRecipeItem = () => {
    if (!selectedInvId) return;
    const inv = (inventory || []).find(i => i.id === selectedInvId);
    if (!inv) return;
    const qtyNum = parseFloat(recipeQty) || 1;
    const unitLabel = recipeDeductType === 'ml' ? 'ml' : (inv.unit || 'units');

    setFormRecipe(prev => {
      const exists = prev.find(r => r.inventoryItemId === selectedInvId);
      if (exists) {
        return prev.map(r => r.inventoryItemId === selectedInvId ? {
          ...r,
          quantity: qtyNum,
          deductionType: recipeDeductType,
          unit: unitLabel
        } : r);
      }
      return [...prev, {
        inventoryItemId: inv.id,
        itemName: inv.name,
        deductionType: recipeDeductType,
        quantity: qtyNum,
        unit: unitLabel
      }];
    });

    setSelectedInvId('');
    setRecipeQty('1');
  };

  // Remove Recipe / Combo Item
  const handleRemoveRecipeItem = (invId: string) => {
    setFormRecipe(prev => prev.filter(r => r.inventoryItemId !== invId));
  };

  // Quick Preset Helper for Peg / Bottle
  const handleApplyQuickRecipe = (type: '30ml' | '60ml' | '1qty' | '4qty') => {
    if (!selectedInvId) {
      alert('Please select an inventory stock item from the dropdown first.');
      return;
    }
    const inv = (inventory || []).find(i => i.id === selectedInvId);
    if (!inv) return;

    if (type === '30ml') {
      setRecipeDeductType('ml');
      setRecipeQty('30');
    } else if (type === '60ml') {
      setRecipeDeductType('ml');
      setRecipeQty('60');
    } else if (type === '1qty') {
      setRecipeDeductType('qty');
      setRecipeQty('1');
    } else if (type === '4qty') {
      setRecipeDeductType('qty');
      setRecipeQty('4');
    }
  };

  // Handle Image File Upload (converted to Base64)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image is too large! Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormImageUrl(base64String);
        setFormImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form Submit (Create / Update)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter an item name');
      return;
    }

    const priceNum = parseFloat(formPrice) || 0;
    const finalCategory = formCategory === 'Custom' 
      ? (formCustomCategory.trim() || 'General') 
      : (formCategory === 'None' ? '' : formCategory);

    // Default dietary detection if not specified
    let finalDietary = formDietary;
    if (formIsBar && formDietary !== 'Drinks' && formDietary !== 'Non-Veg') {
      finalDietary = 'Drinks';
    }

    if (editingItem) {
      // Update existing item
      await updateMenuItem(editingItem.id, {
        name: formName.trim(),
        category: finalCategory,
        price: priceNum,
        isBar: formIsBar,
        isAvailable: editingItem.isAvailable !== false,
        imageUrl: formImageUrl || formImagePreview,
        dietary: finalDietary,
        isCombo: formIsCombo,
        recipe: formRecipe
      });
    } else {
      // Create new item
      const newItem: MenuItem = {
        id: 'm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: formName.trim(),
        category: finalCategory,
        price: priceNum,
        isBar: formIsBar,
        isAvailable: true,
        imageUrl: formImageUrl || formImagePreview,
        dietary: finalDietary,
        isCombo: formIsCombo,
        recipe: formRecipe
      };
      await addMenuItem(newItem);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }

    setIsModalOpen(false);
  };

  // Toggle Item Selection
  const toggleSelectItem = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredItems.map(i => i.id));
    }
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (!selectedItemIds.length) return;
    if (confirm(`Are you sure you want to delete ${selectedItemIds.length} selected items?`)) {
      await batchDeleteMenuItems(selectedItemIds);
      setSelectedItemIds([]);
      setIsSelectMode(false);
    }
  };

  // Seed standard demo items matching screenshots
  const handleSeedStandardMenu = async () => {
    if (confirm('Load standard restaurant & bar sample menu items (Aquafina, Cold Drinks, Sundal, Boiled Egg, Mocktails, etc.)?')) {
      const itemsToCreate: MenuItem[] = SAMPLE_IMAGE_PRESETS.map((p, idx) => ({
        id: 'm_seed_' + Date.now() + '_' + idx,
        name: p.name,
        category: p.category,
        price: idx % 2 === 0 ? 30 : (idx % 3 === 0 ? 50 : 100),
        isBar: p.isBar,
        isAvailable: true,
        imageUrl: p.url,
        dietary: p.dietary,
        isCombo: false
      }));
      await bulkAddMenuItems(itemsToCreate);
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MAIN CONTROLS (Exact layout from user screenshot) */}
      {/* ========================================================================= */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        
        {/* Left: Title & Count Badge */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Menu Items
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
              {filteredItems.length} Items
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure items, prices, and categories for your digital menu.
          </p>
        </div>

        {/* Right: Dietary Filters, Search, Sort & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Dietary Filter Segmented Pills (All, Veg, Non-Veg, Drinks) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/60 dark:border-slate-700/60">
            {(['All', 'Veg', 'Non-Veg', 'Drinks'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDietaryFilter(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  dietaryFilter === d
                    ? 'bg-[#451A03] text-white shadow-sm dark:bg-amber-600'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {d === 'Veg' && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />}
                {d === 'Non-Veg' && <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1.5" />}
                {d === 'Drinks' && <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />}
                {d}
              </button>
            ))}
          </div>

          {/* Outlet Filter Switch (All, Restaurant, Bar) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/60 dark:border-slate-700/60">
            {(['All', 'Restaurant', 'Bar'] as const).map(o => (
              <button
                key={o}
                onClick={() => setOutletFilter(o)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                  outletFilter === o
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {o === 'Restaurant' && <UtensilsCrossed className="w-3 h-3 text-amber-400" />}
                {o === 'Bar' && <Wine className="w-3 h-3 text-rose-400" />}
                {o}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search menu items..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as any)}
              className="appearance-none bg-amber-50/80 dark:bg-slate-800 text-amber-950 dark:text-amber-300 border border-amber-200 dark:border-slate-700 rounded-xl px-3.5 py-2 pr-8 text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="name-asc">⇅ A to Z</option>
              <option value="name-desc">⇅ Z to A</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {/* Select Toggle Button */}
          <button
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              if (isSelectMode) setSelectedItemIds([]);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              isSelectMode
                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>{isSelectMode ? 'Cancel Select' : 'Select'}</span>
          </button>

          {/* + Add New Menu (Terracotta Orange Button matching Image 1) */}
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white font-bold text-xs rounded-xl shadow-md shadow-amber-900/10 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Menu</span>
          </button>

          {/* More Options Menu (...) */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-slate-600 dark:text-slate-300"
              title="More Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div 
                className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-30"
                onClick={() => setShowMoreMenu(false)}
              >
                <button
                  onClick={handleSeedStandardMenu}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Load Demo Catalog
                </button>
                <button
                  onClick={() => {
                    const jsonStr = JSON.stringify(menuItems, null, 2);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `menu_items_${currentTenant?.slug || 'export'}.json`;
                    a.click();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  Export Menu (JSON)
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CATEGORY FILTER PILLS ROW (Second row matching screenshot) */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            selectedCategory === 'All'
              ? 'bg-[#451A03] text-white shadow-sm dark:bg-amber-600'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          All
        </button>

        {availableCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-[#451A03] text-white shadow-sm dark:bg-amber-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}

        <button
          onClick={() => setSelectedCategory('No Category')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            selectedCategory === 'No Category'
              ? 'bg-[#451A03] text-white shadow-sm dark:bg-amber-600'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          No Category
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. BATCH ACTIONS BAR (When multi-select is active) */}
      {/* ========================================================================= */}
      {isSelectMode && (
        <div className="bg-amber-500 text-white px-5 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3 text-xs font-bold">
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              {selectedItemIds.length === filteredItems.length ? 'Deselect All' : 'Select All'}
            </button>
            <span>{selectedItemIds.length} item(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchDelete}
              disabled={selectedItemIds.length === 0}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MENU ITEMS GRID (Cards matching Image 1 exact layout) */}
      {/* ========================================================================= */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
          <ChefHat className="w-12 h-12 text-amber-500 mx-auto mb-3 opacity-60 animate-bounce" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Menu Items Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No dishes or drinks match your current search and filter criteria.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create First Menu Item
            </button>
            <button
              onClick={handleSeedStandardMenu}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Load Sample Catalog
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map(item => {
            const isSelected = selectedItemIds.includes(item.id);
            const dietary = item.dietary || (item.category === 'Beverages' || item.isBar ? 'Drinks' : 'Veg');
            const hasImage = Boolean(item.imageUrl && item.imageUrl.trim().length > 0);

            return (
              <div
                key={item.id}
                className={`group bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between hover:shadow-lg ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                    : 'border-slate-200/80 dark:border-slate-800/80 hover:border-amber-500/50'
                }`}
              >
                {/* Top Image Container */}
                <div className="relative h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {hasImage ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => {
                        // Fallback on image load error
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 dark:from-slate-800 dark:to-slate-850 p-4 text-center">
                      {item.isBar ? (
                        <Wine className="w-10 h-10 text-rose-400 mb-1" />
                      ) : (
                        <UtensilsCrossed className="w-10 h-10 text-amber-500 mb-1" />
                      )}
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 line-clamp-1">
                        {item.category || 'Menu Item'}
                      </span>
                    </div>
                  )}

                  {/* Multi-select checkbox overlay */}
                  {isSelectMode && (
                    <button
                      onClick={() => toggleSelectItem(item.id)}
                      className="absolute top-2.5 left-2.5 z-10 p-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 shadow-sm transition-transform active:scale-90"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  )}

                  {/* Outlet Badge (Restaurant vs Bar) */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide backdrop-blur-md shadow-sm flex items-center gap-1 ${
                      item.isBar
                        ? 'bg-purple-900/80 text-purple-200 border border-purple-400/30'
                        : 'bg-emerald-900/80 text-emerald-200 border border-emerald-400/30'
                    }`}>
                      {item.isBar ? <Wine className="w-2.5 h-2.5" /> : <UtensilsCrossed className="w-2.5 h-2.5" />}
                      {item.isBar ? 'Bar' : 'Restaurant'}
                    </span>
                  </div>

                  {/* Combo Badge if applicable */}
                  {item.isCombo && (
                    <div className="absolute bottom-2 left-2.5 z-10">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-600 text-white shadow-sm">
                        COMBO
                      </span>
                    </div>
                  )}

                  {/* Quick Action Overlay (Hover Buttons) */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-2 bg-white text-slate-900 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-md active:scale-95"
                      title="Edit Item"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${item.name}" from menu?`)) {
                          deleteMenuItem(item.id);
                        }
                      }}
                      className="p-2 bg-white text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-md active:scale-95"
                      title="Delete Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Content (Exact layout matching Image 1) */}
                <div className="p-4 flex flex-col justify-between flex-1">
                  
                  {/* Item Name & Dietary Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-tight">
                      {item.name}
                    </h4>

                    {/* Dietary Tag Pill */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      dietary === 'Drinks'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300'
                        : dietary === 'Non-Veg'
                        ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300'
                    }`}>
                      {dietary}
                    </span>
                  </div>

                  {/* Linked Inventory Recipe / Combo Items Indicator */}
                  {item.recipe && item.recipe.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                        {item.isCombo ? <Boxes className="w-3 h-3 text-indigo-500" /> : <Droplets className="w-3 h-3 text-amber-600" />}
                        <span>{item.isCombo ? 'Combo Package' : 'Stock Auto-Deduct'}:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {item.recipe.map((r, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-[9px] font-bold text-slate-700 dark:text-slate-300">
                            <span className="text-amber-600 dark:text-amber-400 font-black">
                              {r.quantity} {r.deductionType === 'ml' ? 'ml' : (r.unit || 'qty')}
                            </span>
                            <span className="truncate max-w-[95px]">{r.itemName}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Row at Bottom */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                      Price
                    </span>
                    <span className="text-base font-black text-[#C2410C] dark:text-amber-400 font-mono">
                      ₹{Number(item.price || 0).toFixed(2)}
                    </span>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CREATE / EDIT MENU MODAL (Matching Image 2 exact layout & design) */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#FAF7F2] dark:bg-slate-900 rounded-[28px] shadow-2xl border border-amber-200/50 dark:border-slate-700 overflow-hidden my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-xl font-black text-[#451A03] dark:text-amber-400 tracking-tight">
                {editingItem ? 'Edit Menu Item' : 'Create Menu'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              
              {/* 1. PRODUCT IMAGE (OPTIONAL) */}
              <div>
                <label className="block text-[11px] font-black tracking-wider text-[#78350F] dark:text-amber-300/80 uppercase mb-2">
                  PRODUCT IMAGE (OPTIONAL)
                </label>

                <div className="flex items-center gap-3">
                  {/* Upload Box / Image Preview */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-600 bg-white/70 dark:bg-slate-800/60 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all shrink-0"
                  >
                    {formImagePreview ? (
                      <img src={formImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-amber-800/40 dark:text-slate-500" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-amber-50 rounded-xl text-xs font-bold text-[#451A03] dark:text-slate-200 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-700" />
                      Upload Image
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPresetPicker(!showPresetPicker)}
                      className="text-[11px] text-amber-700 dark:text-amber-400 font-bold hover:underline block"
                    >
                      {showPresetPicker ? 'Hide Photo Presets' : 'Choose Sample Photo Preset'}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Photo Presets Grid */}
                {showPresetPicker && (
                  <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {SAMPLE_IMAGE_PRESETS.map((preset, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setFormImageUrl(preset.url);
                          setFormImagePreview(preset.url);
                          if (!formName) setFormName(preset.name);
                          setFormDietary(preset.dietary);
                          setFormIsBar(preset.isBar);
                          setFormCategory(preset.category);
                          setShowPresetPicker(false);
                        }}
                        className="cursor-pointer group relative rounded-xl overflow-hidden aspect-square border border-slate-200 hover:border-amber-600"
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white font-bold text-center p-1">
                          Select
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. ITEM NAME */}
              <div>
                <label className="block text-[11px] font-black tracking-wider text-[#78350F] dark:text-amber-300/80 uppercase mb-1.5">
                  ITEM NAME *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g., Fish Momo Plate"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                />
              </div>

              {/* 3. OUTLET / SERVICE SWITCH (Crucial requested feature: switch for Bar or Restaurant) */}
              <div>
                <label className="block text-[11px] font-black tracking-wider text-[#78350F] dark:text-amber-300/80 uppercase mb-1.5">
                  OUTLET / SERVICE LOCATION *
                </label>
                
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700 rounded-2xl">
                  {/* Restaurant Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormIsBar(false);
                      if (formCategory === 'Cocktails' || formCategory === 'Liquor' || formCategory === 'Beer & Wine') {
                        setFormCategory('Main Course');
                      }
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                      !formIsBar
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Restaurant / Dining</span>
                  </button>

                  {/* Bar Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormIsBar(true);
                      setFormDietary('Drinks');
                      if (formCategory === 'None' || formCategory === 'Main Course') {
                        setFormCategory('Cocktails');
                      }
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                      formIsBar
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Wine className="w-4 h-4" />
                    <span>Bar / Lounge</span>
                  </button>
                </div>
              </div>

              {/* 4. CATEGORY */}
              <div>
                <label className="block text-[11px] font-black tracking-wider text-[#78350F] dark:text-amber-300/80 uppercase mb-1.5">
                  CATEGORY
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                >
                  <option value="None">None (Remove Category)</option>
                  {!formIsBar ? (
                    <>
                      <option value="Starters">Starters / Appetizers</option>
                      <option value="Main Course">Main Course</option>
                      <option value="Breakfast">Breakfast</option>
                      <option value="Beverages">Beverages / Soft Drinks</option>
                      <option value="Desserts">Desserts</option>
                      <option value="Snacks">Snacks</option>
                    </>
                  ) : (
                    <>
                      <option value="Cocktails">Cocktails</option>
                      <option value="Beer & Wine">Beer & Wine</option>
                      <option value="Liquor">Liquor & Spirits</option>
                      <option value="Snacks">Bar Snacks</option>
                      <option value="Beverages">Chasers & Soft Drinks</option>
                    </>
                  )}
                  {availableCategories.filter(c => !['Starters', 'Main Course', 'Breakfast', 'Beverages', 'Desserts', 'Cocktails', 'Beer & Wine', 'Liquor', 'Snacks'].includes(c)).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Custom">+ Add Custom Category...</option>
                </select>

                {formCategory === 'Custom' && (
                  <input
                    type="text"
                    value={formCustomCategory}
                    onChange={e => setFormCustomCategory(e.target.value)}
                    placeholder="Enter custom category name"
                    className="w-full mt-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                  />
                )}
              </div>

              {/* 5. DIETARY (Veg, Non-Veg, Drinks Radios matching screenshot) */}
              <div>
                <label className="block text-[11px] font-black tracking-wider text-[#78350F] dark:text-amber-300/80 uppercase mb-2">
                  DIETARY
                </label>

                <div className="flex items-center gap-6">
                  {/* Veg */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dietary"
                      value="Veg"
                      checked={formDietary === 'Veg'}
                      onChange={() => setFormDietary('Veg')}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      Veg
                    </span>
                  </label>

                  {/* Non-Veg */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dietary"
                      value="Non-Veg"
                      checked={formDietary === 'Non-Veg'}
                      onChange={() => setFormDietary('Non-Veg')}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500 accent-rose-600"
                    />
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                      Non-Veg
                    </span>
                  </label>

                  {/* Drinks */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dietary"
                      value="Drinks"
                      checked={formDietary === 'Drinks'}
                      onChange={() => setFormDietary('Drinks')}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500 accent-amber-600"
                    />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      Drinks
                    </span>
                  </label>
                </div>
              </div>

              {/* 6. THIS IS A COMBO ITEM (Checkbox) */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsCombo}
                    onChange={e => setFormIsCombo(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 accent-amber-600"
                  />
                  <span className="text-xs font-black tracking-wider text-[#78350F] dark:text-amber-300/90 uppercase flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                    THIS IS A COMBO PACKAGE ITEM
                  </span>
                </label>
                {formIsCombo && (
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1 pl-6">
                    Combo mode allows bundling multiple stock SKUs (e.g. 4 Beers + 1 Snack + 1 Water) that deduct together upon sale.
                  </p>
                )}
              </div>

              {/* 7. INVENTORY STOCK DEDUCTION & RECIPE / COMBO MAPPING SECTION */}
              <div className="p-3.5 bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200/80 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {formIsCombo ? (
                      <Boxes className="w-4 h-4 text-indigo-600" />
                    ) : formIsBar ? (
                      <Wine className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Package className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {formIsCombo ? 'Combo Package Item Mapping' : 'Stock Deduction / Recipe Mapping'}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-slate-700 text-amber-900 dark:text-amber-300">
                    {formRecipe.length} {formRecipe.length === 1 ? 'Item' : 'Items'} Mapped
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formIsCombo 
                    ? 'Add all items included in this combo package with their deduction quantities.' 
                    : 'Map this menu item to inventory stock. Choose whether to deduct in ML (liquor/pegs) or Qty (bottles/pieces).'}
                </p>

                {/* Recipe Item Inputs */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Select Inventory SKU */}
                    <div className="sm:col-span-6">
                      <select
                        value={selectedInvId}
                        onChange={e => setSelectedInvId(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select Inventory Stock Item...</option>
                        {(inventory || []).map(inv => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} (Stock: {inv.stock} {inv.unit} - {inv.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Deduction Type (ML vs QTY) */}
                    <div className="sm:col-span-3">
                      <select
                        value={recipeDeductType}
                        onChange={e => setRecipeDeductType(e.target.value as 'ml' | 'qty')}
                        className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="ml">ML (Peg/Vol)</option>
                        <option value="qty">Qty (Bottles/Pcs)</option>
                      </select>
                    </div>

                    {/* Quantity Input */}
                    <div className="sm:col-span-3 flex gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={recipeQty}
                        onChange={e => setRecipeQty(e.target.value)}
                        placeholder={recipeDeductType === 'ml' ? '30' : '1'}
                        className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Quick Shortcut Buttons for Bar/Drink/Combo */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => handleApplyQuickRecipe('30ml')}
                        className="px-2 py-1 bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        🥃 30ml Peg
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyQuickRecipe('60ml')}
                        className="px-2 py-1 bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        🥃 60ml Large
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyQuickRecipe('1qty')}
                        className="px-2 py-1 bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        🍾 1 Bottle/Qty
                      </button>
                      {formIsCombo && (
                        <button
                          type="button"
                          onClick={() => handleApplyQuickRecipe('4qty')}
                          className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-lg text-[10px] font-bold text-indigo-700 dark:text-indigo-300 transition-colors"
                        >
                          🎁 4x Combo Qty
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddRecipeItem}
                      disabled={!selectedInvId}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to {formIsCombo ? 'Combo' : 'Recipe'}
                    </button>
                  </div>
                </div>

                {/* List of Configured Items */}
                {formRecipe.length > 0 ? (
                  <div className="space-y-1.5 pt-2 border-t border-amber-200/60 dark:border-slate-700 max-h-40 overflow-y-auto">
                    {formRecipe.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center text-[10px] font-black">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-100">
                              {item.itemName}
                            </span>
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Deducts: {item.quantity} {item.deductionType === 'ml' ? 'ml' : (item.unit || 'unit')}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRecipeItem(item.inventoryItemId)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-[11px] text-slate-400 italic">
                    No stock item mapped yet. (Optional - add items above to auto-deduct inventory on order).
                  </div>
                )}
              </div>

              {/* 8. PRICE */}
              <div className="pt-2">
                <label className="block text-[11px] font-black tracking-wider text-[#78350F] dark:text-amber-300/80 uppercase mb-1.5">
                  PRICE (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded-2xl text-sm font-bold font-mono text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                  />
                </div>
              </div>

              {/* 8. CREATE / UPDATE ITEM SUBMIT BUTTON (Terracotta Orange matching Image 2) */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-[#C2410C] hover:bg-[#9A3412] text-white text-sm font-black rounded-2xl shadow-lg shadow-amber-950/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>{editingItem ? 'Save Changes' : 'Create Item'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
