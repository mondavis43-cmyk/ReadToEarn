import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function RewardCard({ product, userBalance }) {
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    if (userBalance < product.minPrice) {
      alert("Keep reading! You don't have enough yet.");
      return;
    }

    setLoading(true);
    
    // Call the Supabase Edge Function we just created
    const { data, error } = await supabase.functions.invoke('process-payout', {
      body: { 
        productId: product.id, 
        amount: product.minPrice, 
        recipientEmail: 'user@email.com' // Usually current user email
      }
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Success! Check your email for your gift card.");
    }
    setLoading(false);
  };

  return (
    <div className="border p-4 rounded-xl shadow-sm bg-white">
      <img src={product.logo} alt={product.name} className="w-16 h-16 mb-2" />
      <h3 className="font-bold">{product.name}</h3>
      <p className="text-sm text-gray-500">${product.minPrice} Minimum</p>
      
      <button 
        onClick={handleRedeem}
        disabled={loading || userBalance < product.minPrice}
        className={`mt-4 w-full py-2 rounded-lg font-semibold ${
          userBalance >= product.minPrice 
            ? 'bg-green-600 text-white hover:bg-green-700' 
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {loading ? 'Processing...' : userBalance >= product.minPrice ? 'Redeem Now' : 'Locked'}
      </button>
    </div>
  );
}
