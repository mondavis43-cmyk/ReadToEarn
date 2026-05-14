import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PACKAGES = [
  { label: 'Basic',    readers: 1, cents: 4900  },
  { label: 'Standard', readers: 2, cents: 8900  },
  { label: 'Premium',  readers: 3, cents: 12900 },
];

export default function AuthorSensitivityReaders() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [bookTitle,    setBookTitle]    = useState('');
  const [identities,   setIdentities]   = useState('');
  const [selectedPkg,  setSelectedPkg]  = useState(0);

  const handleCheckout = () => {
    const selectedPackage    = PACKAGES[selectedPkg];
    const processedIdentities = identities
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    sessionStorage.setItem('checkoutItem', JSON.stringify({
      type: 'sensitivity_readers',
      label: `Sensitivity Readers — ${selectedPackage.label} (${selectedPackage.readers} readers) — ${bookTitle}`,
      amount: selectedPackage.cents,
      metadata: {
        package:    selectedPackage.label,
        readers:    String(selectedPackage.readers),
        identities: JSON.stringify(processedIdentities),
      },
    }));

    navigate('/checkout');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sensitivity Readers</h1>

      <label className="block mb-2 font-medium">Book Title</label>
      <input
        className="w-full border rounded p-2 mb-4"
        value={bookTitle}
        onChange={e => setBookTitle(e.target.value)}
        placeholder="Enter your book title"
      />

      <label className="block mb-2 font-medium">
        Identities / Lived Experiences (comma-separated)
      </label>
      <input
        className="w-full border rounded p-2 mb-4"
        value={identities}
        onChange={e => setIdentities(e.target.value)}
        placeholder="e.g. Black, Disabled, LGBTQ+"
      />

      <label className="block mb-2 font-medium">Select Package</label>
      <div className="flex gap-4 mb-6">
        {PACKAGES.map((pkg, i) => (
          <button
            key={pkg.label}
            onClick={() => setSelectedPkg(i)}
            className={`flex-1 border rounded p-3 text-center ${
              selectedPkg === i ? 'bg-blue-600 text-white' : 'bg-white'
            }`}
          >
            <div className="font-semibold">{pkg.label}</div>
            <div className="text-sm">{pkg.readers} reader{pkg.readers > 1 ? 's' : ''}</div>
            <div className="text-sm">${(pkg.cents / 100).toFixed(2)}</div>
          </button>
        ))}
      </div>

      <button
        onClick={handleCheckout}
        disabled={!bookTitle.trim()}
        className="w-full bg-blue-600 text-white py-3 rounded font-semibold disabled:opacity-50"
      >
        Proceed to Checkout
      </button>
    </div>
  );
}
