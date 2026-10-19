import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TestTemplate, TestParameterDefinition } from '../types/lab';
import {
  FlaskConical,
  Search,
  Clock,
  Edit2,
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  Plus,
  Trash2,
  Package,
  Layers,
} from 'lucide-react';

interface TestCatalogViewProps {
  testTemplates: TestTemplate[];
  onUpdateTemplate: (id: string, updates: Partial<TestTemplate>) => void;
  onAddTemplate: (template: Omit<TestTemplate, 'id'>) => void;
  onDeleteTemplate?: (id: string) => void;
}

export const TestCatalogView: React.FC<TestCatalogViewProps> = ({
  testTemplates,
  onUpdateTemplate,
  onAddTemplate,
  onDeleteTemplate,
}) => {
  const { currentUser, hasPermission } = useAuth();
  const canEditCatalog = hasPermission('EDIT_TEST_CATALOG');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Full Edit Modal State
  const [editingTemplate, setEditingTemplate] = useState<TestTemplate | null>(null);

  // New Custom Test / Profile Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState('Biochemistry');
  const [newPrice, setNewPrice] = useState(500);
  const [newSampleType, setNewSampleType] = useState('Serum Clot (2ml)');
  const [newTurnaroundHours, setNewTurnaroundHours] = useState(4);
  const [isPackage, setIsPackage] = useState(false);
  const [newParams, setNewParams] = useState<TestParameterDefinition[]>([
    {
      name: '',
      unit: '',
      maleRange: '',
      femaleRange: '',
      childRange: '',
      minNormal: undefined,
      maxNormal: undefined,
    },
  ]);

  // Categories list
  const categories = Array.from(new Set(testTemplates.map((t) => t.category)));

  const filtered = testTemplates.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q);
    const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Handle Add Parameter in New Test Modal
  const handleAddParamRow = () => {
    setNewParams((prev) => [
      ...prev,
      {
        name: '',
        unit: '',
        maleRange: '',
        femaleRange: '',
        childRange: '',
        minNormal: undefined,
        maxNormal: undefined,
      },
    ]);
  };

  const handleRemoveParamRow = (idx: number) => {
    setNewParams((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleParamChange = (idx: number, field: keyof TestParameterDefinition, val: any) => {
    setNewParams((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleCreateTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Kripya Test ka naam enter karein.');
      return;
    }

    const validParams = newParams.filter((p) => p.name.trim() !== '');
    if (validParams.length === 0) {
      alert('Kam se kam ek investigation parameter add karein.');
      return;
    }

    onAddTemplate({
      name: newName.trim(),
      code: newCode.trim() || `TEST-${Date.now().toString().slice(-4)}`,
      category: newCategory.trim(),
      price: Number(newPrice) || 0,
      turnaroundHours: Number(newTurnaroundHours) || 2,
      sampleType: newSampleType.trim() || 'Blood / Serum',
      isPackage,
      parameters: validParams,
    });

    setShowAddModal(false);
    setNewName('');
    setNewCode('');
    setNewPrice(500);
    setNewParams([
      {
        name: '',
        unit: '',
        maleRange: '',
        femaleRange: '',
        childRange: '',
        minNormal: undefined,
        maxNormal: undefined,
      },
    ]);
  };

  // Handle Updating Existing Template
  const handleSaveEditTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    onUpdateTemplate(editingTemplate.id, {
      name: editingTemplate.name,
      code: editingTemplate.code,
      category: editingTemplate.category,
      price: Number(editingTemplate.price),
      sampleType: editingTemplate.sampleType,
      turnaroundHours: Number(editingTemplate.turnaroundHours),
      parameters: editingTemplate.parameters,
    });

    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-slate-900 tracking-tight">
            Diagnostic Test Catalog & Health Profiles
          </h1>
          <p className="text-xs text-slate-500">
            Configure blood test names, prices, parameter names, and standard reference intervals (Male / Female / Child).
          </p>
        </div>

        {canEditCatalog ? (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Custom Test / Package Profile</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <span>View Only (Editing restricted by Owner)</span>
          </div>
        )}
      </div>

      {/* Permission banner */}
      {!canEditCatalog ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Staff Restricted Mode:</strong> Test catalog, prices, parameters aur normal ranges edit karne ke liye <strong>Owner</strong> permission zaroori hai.
            </span>
          </div>
          <span className="text-[11px] text-amber-700 font-medium">Read-Only View</span>
        </div>
      ) : (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Catalog Editing Authorized:</strong> Aap kisi bhi test ka naam, price, parameters, aur Male/Female/Child reference ranges edit kar sakte hain aur custom test profiles bana sakte hain.
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search test names, code, or parameters (e.g. CBC, LFT, Surgical Profile)..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white cursor-pointer"
          >
            <option value="ALL">All Categories ({testTemplates.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Test Panels Grid */}
      <div className="space-y-4">
        {filtered.map((test) => (
          <div
            key={test.id}
            className={`bg-white rounded-xl border shadow-xs overflow-hidden transition-all ${
              test.isPackage ? 'border-cyan-300 ring-1 ring-cyan-100' : 'border-slate-200'
            }`}
          >
            {/* Header */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    test.isPackage
                      ? 'bg-cyan-600 text-white'
                      : 'bg-cyan-100 text-cyan-800'
                  }`}
                >
                  {test.isPackage ? <Package className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold font-heading text-slate-900">{test.name}</h3>
                    <span className="font-mono text-[10px] text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                      {test.code}
                    </span>
                    {test.isPackage && (
                      <span className="bg-cyan-100 text-cyan-800 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Custom Health Profile
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                    <span>Category: <strong className="text-slate-700">{test.category}</strong></span>
                    <span>·</span>
                    <span>Sample: <strong className="text-slate-700">{test.sampleType}</strong></span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>TAT: {test.turnaroundHours} hrs</span>
                    </span>
                    <span>·</span>
                    <span>{test.parameters.length} Parameters</span>
                  </div>
                </div>
              </div>

              {/* Price & Edit Button */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-slate-900">
                    ₹{test.price}
                  </span>
                  <span className="block text-[10px] text-slate-400">Standard Rate</span>
                </div>

                {canEditCatalog && (
                  <button
                    type="button"
                    onClick={() => setEditingTemplate(JSON.parse(JSON.stringify(test)))}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-cyan-600 hover:text-cyan-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Test & Ranges</span>
                  </button>
                )}
              </div>
            </div>

            {/* Parameters Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-[11px] bg-slate-50/40">
                    <th className="py-2 px-4 w-1/3">Investigation Parameter</th>
                    <th className="py-2 px-4 w-24">Unit</th>
                    <th className="py-2 px-4">Standard Reference Interval (Male)</th>
                    <th className="py-2 px-4">Standard Reference Interval (Female)</th>
                    <th className="py-2 px-4">Pediatric / Child Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {test.parameters.map((p, idx) => (
                    <tr key={p.name + idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-4 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-2 px-4 font-mono text-slate-500">{p.unit || '-'}</td>
                      <td className="py-2 px-4 text-slate-600 font-mono text-[11px]">
                        {p.maleRange || p.generalRange || '-'}
                      </td>
                      <td className="py-2 px-4 text-slate-600 font-mono text-[11px]">
                        {p.femaleRange || p.generalRange || '-'}
                      </td>
                      <td className="py-2 px-4 text-slate-500 font-mono text-[11px]">
                        {p.childRange || 'As per adult'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Existing Test Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-3 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">
                  Edit Test: {editingTemplate.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Update test name, price, sample requirements, and reference ranges.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTemplate} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Blood Test / Profile Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Standard Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingTemplate.price}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Test Code
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.code}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, code: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.category}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sample Type
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.sampleType}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, sampleType: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Parameters List in Edit Mode */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Parameters & Biological Reference Intervals ({editingTemplate.parameters.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate({
                        ...editingTemplate,
                        parameters: [
                          ...editingTemplate.parameters,
                          {
                            name: '',
                            unit: '',
                            maleRange: '',
                            femaleRange: '',
                            childRange: '',
                          },
                        ],
                      });
                    }}
                    className="text-xs font-semibold text-cyan-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Parameter</span>
                  </button>
                </div>

                <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-1">
                  {editingTemplate.parameters.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-3">
                        <span className="text-[10px] text-slate-500 block">Parameter Name</span>
                        <input
                          type="text"
                          required
                          value={p.name}
                          onChange={(e) => {
                            const params = [...editingTemplate.parameters];
                            params[idx].name = e.target.value;
                            setEditingTemplate({ ...editingTemplate, parameters: params });
                          }}
                          placeholder="e.g. Hemoglobin"
                          className="w-full px-2 py-1 text-xs font-medium border border-slate-300 rounded bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-500 block">Unit</span>
                        <input
                          type="text"
                          value={p.unit}
                          onChange={(e) => {
                            const params = [...editingTemplate.parameters];
                            params[idx].unit = e.target.value;
                            setEditingTemplate({ ...editingTemplate, parameters: params });
                          }}
                          placeholder="g/dL"
                          className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-500 block">Male Range</span>
                        <input
                          type="text"
                          value={p.maleRange}
                          onChange={(e) => {
                            const params = [...editingTemplate.parameters];
                            params[idx].maleRange = e.target.value;
                            setEditingTemplate({ ...editingTemplate, parameters: params });
                          }}
                          placeholder="13.0 - 17.0"
                          className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-500 block">Female Range</span>
                        <input
                          type="text"
                          value={p.femaleRange}
                          onChange={(e) => {
                            const params = [...editingTemplate.parameters];
                            params[idx].femaleRange = e.target.value;
                            setEditingTemplate({ ...editingTemplate, parameters: params });
                          }}
                          placeholder="12.0 - 15.0"
                          className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-500 block">Min / Max Num</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={p.minNormal ?? ''}
                            onChange={(e) => {
                              const params = [...editingTemplate.parameters];
                              params[idx].minNormal = e.target.value ? Number(e.target.value) : undefined;
                              setEditingTemplate({ ...editingTemplate, parameters: params });
                            }}
                            placeholder="Min"
                            className="w-1/2 px-1 py-1 text-[11px] font-mono border border-slate-300 rounded bg-white"
                            title="Minimum normal value for RED alert"
                          />
                          <input
                            type="number"
                            step="any"
                            value={p.maxNormal ?? ''}
                            onChange={(e) => {
                              const params = [...editingTemplate.parameters];
                              params[idx].maxNormal = e.target.value ? Number(e.target.value) : undefined;
                              setEditingTemplate({ ...editingTemplate, parameters: params });
                            }}
                            placeholder="Max"
                            className="w-1/2 px-1 py-1 text-[11px] font-mono border border-slate-300 rounded bg-white"
                            title="Maximum normal value for RED alert"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-1 text-right pt-3 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => {
                            const params = editingTemplate.parameters.filter((_, i) => i !== idx);
                            setEditingTemplate({ ...editingTemplate, parameters: params });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-semibold cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Custom Test / Package Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-3 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">
                  + Create Custom Blood Test / Health Profile
                </h3>
                <p className="text-xs text-slate-500">
                  Define a single investigation or bundled package (e.g. Surgical Profile, Fever Panel).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTestSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Test / Profile Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Surgical Profile (Pre-Operative) or Dengue Combo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Standard Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Test Code
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. SURG-01"
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Health Packages"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sample Specimen
                  </label>
                  <input
                    type="text"
                    value={newSampleType}
                    onChange={(e) => setNewSampleType(e.target.value)}
                    placeholder="e.g. EDTA Blood + Serum"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Package checkbox */}
              <div className="bg-cyan-50/70 border border-cyan-100 p-3 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-cyan-900">
                  <input
                    type="checkbox"
                    checked={isPackage}
                    onChange={(e) => setIsPackage(e.target.checked)}
                    className="rounded text-cyan-700"
                  />
                  <span>
                    Yeh ek Multi-Test Package / Profile hai (jaise Surgical Profile, jisme multiple tests ek saath aate hain)
                  </span>
                </label>
              </div>

              {/* Parameters list builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Add Parameters & Reference Ranges ({newParams.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddParamRow}
                    className="text-xs font-semibold text-cyan-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Parameter</span>
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1">
                  {newParams.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-3">
                        <span className="text-[10px] text-slate-500 block">Parameter Name *</span>
                        <input
                          type="text"
                          required
                          value={p.name}
                          onChange={(e) => handleParamChange(idx, 'name', e.target.value)}
                          placeholder="e.g. Bleeding Time (BT)"
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-500 block">Unit</span>
                        <input
                          type="text"
                          value={p.unit}
                          onChange={(e) => handleParamChange(idx, 'unit', e.target.value)}
                          placeholder="min"
                          className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-500 block">Male Range</span>
                        <input
                          type="text"
                          value={p.maleRange}
                          onChange={(e) => handleParamChange(idx, 'maleRange', e.target.value)}
                          placeholder="2 - 7 min"
                          className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-500 block">Female Range</span>
                        <input
                          type="text"
                          value={p.femaleRange}
                          onChange={(e) => handleParamChange(idx, 'femaleRange', e.target.value)}
                          placeholder="2 - 7 min"
                          className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-500 block">Min / Max Num</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={p.minNormal ?? ''}
                            onChange={(e) =>
                              handleParamChange(
                                idx,
                                'minNormal',
                                e.target.value ? Number(e.target.value) : undefined
                              )
                            }
                            placeholder="Min"
                            className="w-1/2 px-1 py-1 text-[11px] font-mono border border-slate-300 rounded bg-white"
                          />
                          <input
                            type="number"
                            step="any"
                            value={p.maxNormal ?? ''}
                            onChange={(e) =>
                              handleParamChange(
                                idx,
                                'maxNormal',
                                e.target.value ? Number(e.target.value) : undefined
                              )
                            }
                            placeholder="Max"
                            className="w-1/2 px-1 py-1 text-[11px] font-mono border border-slate-300 rounded bg-white"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-1 text-right pt-2 sm:pt-0">
                        {newParams.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveParamRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-semibold cursor-pointer shadow-xs"
                >
                  Create Test Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
